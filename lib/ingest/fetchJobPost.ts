import "server-only";
import dns from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import ipaddr from "ipaddr.js";
import { Agent, ProxyAgent, fetch as undiciFetch, type Dispatcher } from "undici";
import { env } from "@/lib/env";
import { htmlToVisibleText, MAX_FETCHED_CHARS, MIN_MEANINGFUL_CHARS, normalizeText } from "@/lib/ingest/sanitize";
import { isAllowedByRobots } from "@/lib/ingest/robots";

/** Blueprint 04 §4.1 */
export const FETCH_LIMITS = { timeoutMs: 8_000, maxBytes: 2 * 1024 * 1024, maxRedirects: 3, maxUrlLength: 2048 } as const;
export const BOT_USER_AGENT = "ZJobsAgentBot/1.0 (+cek loker palsu; tanpa login)";

export type FetchStatus = "ok" | "blocked" | "failed";
export type FetchResult = {
  status: FetchStatus;
  /** Kode alasan untuk log & pesan UI. */
  reason?: "invalid_url" | "private_address" | "dns_failed" | "robots_disallowed" | "login_or_forbidden" | "http_error" | "timeout" | "too_large" | "unsupported_type" | "empty_content" | "too_many_redirects" | "network_error";
  finalUrl?: string;
  title?: string | null;
  text?: string;
  truncated?: boolean;
  hiddenRemoved?: number;
};

// ---------------------------------------------------------------------------
// Validasi URL & alamat (anti-SSRF)
// ---------------------------------------------------------------------------

/**
 * HANYA untuk tes otomatis (server fixture di 127.0.0.1). Tidak pernah aktif di dev/produksi.
 */
function testLoopbackAllowed(ip?: string): boolean {
  if (process.env.NODE_ENV !== "test" || process.env.ZJ_TEST_ALLOW_LOOPBACK !== "1") return false;
  return ip === undefined || ip === "127.0.0.1";
}

export function isPublicAddress(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;
  let addr = ipaddr.parse(ip);
  if (addr.kind() === "ipv6") {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) addr = v6.toIPv4Address();
  }
  // ipaddr.js memberi "unicast" hanya untuk alamat publik; private, loopback, linkLocal,
  // carrierGradeNat, uniqueLocal, reserved, multicast, dll. ditolak.
  return addr.range() === "unicast";
}

export function validateJobUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: "invalid_url" | "private_address" } {
  if (raw.length > FETCH_LIMITS.maxUrlLength) return { ok: false, reason: "invalid_url" };
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "invalid_url" };
  if (url.username || url.password) return { ok: false, reason: "invalid_url" };
  if (url.port && url.port !== "80" && url.port !== "443" && !testLoopbackAllowed()) return { ok: false, reason: "invalid_url" };

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || /\.(localhost|local|internal|lan|home|corp|intranet)$/.test(host) || !host.includes(".") && !ipaddr.isValid(host)) {
    return { ok: false, reason: "private_address" };
  }
  if (ipaddr.isValid(host) && !isPublicAddress(host) && !testLoopbackAllowed(host)) return { ok: false, reason: "private_address" };
  url.hash = "";
  return { ok: true, url };
}

async function resolvePublic(hostname: string): Promise<{ ok: true; address: LookupAddress } | { ok: false; reason: "dns_failed" | "private_address" }> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (ipaddr.isValid(host)) {
    if (!isPublicAddress(host) && !testLoopbackAllowed(host)) return { ok: false, reason: "private_address" };
    return { ok: true, address: { address: host, family: host.includes(":") ? 6 : 4 } };
  }
  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    return { ok: false, reason: "dns_failed" };
  }
  if (addresses.length === 0) return { ok: false, reason: "dns_failed" };
  // Semua alamat harus publik (mencegah DNS yang mencampur IP publik & privat).
  if (!addresses.every((a) => isPublicAddress(a.address))) return { ok: false, reason: "private_address" };
  return { ok: true, address: addresses[0] };
}

/** Dispatcher yang memaku koneksi ke IP yang sudah divalidasi (mencegah DNS rebinding). */
function pinnedDispatcher(pinned: LookupAddress): Dispatcher {
  return new Agent({
    connect: {
      lookup: (_hostname: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) => {
        if (options?.all) callback(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      },
    },
  } as ConstructorParameters<typeof Agent>[0]);
}

function devProxyDispatcher(): Dispatcher | null {
  // Hanya untuk pengembangan di lingkungan yang mewajibkan proxy keluar. Produksi selalu memakai pinnedDispatcher.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy || env.isProduction || process.env.NODE_ENV === "test") return null;
  return new ProxyAgent(proxy);
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

type RawResponse = { status: number; headers: Headers; body: string | null; tooLarge: boolean };

async function safeGet(url: URL, signal: AbortSignal, accept: string): Promise<{ ok: true; res: RawResponse } | { ok: false; reason: FetchResult["reason"] }> {
  const proxy = devProxyDispatcher();
  let dispatcher: Dispatcher;
  if (proxy) {
    const resolved = await resolvePublic(url.hostname);
    if (!resolved.ok && resolved.reason === "private_address") return { ok: false, reason: "private_address" };
    dispatcher = proxy;
  } else {
    const resolved = await resolvePublic(url.hostname);
    if (!resolved.ok) return { ok: false, reason: resolved.reason };
    dispatcher = pinnedDispatcher(resolved.address);
  }

  try {
    const res = await undiciFetch(url, {
      dispatcher,
      redirect: "manual",
      signal,
      headers: { "user-agent": BOT_USER_AGENT, accept, "accept-language": "id-ID,id;q=0.9,en;q=0.8" },
    });
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel();
      return { ok: true, res: { status: res.status, headers: res.headers as unknown as Headers, body: null, tooLarge: false } };
    }
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > FETCH_LIMITS.maxBytes) {
      await res.body?.cancel();
      return { ok: true, res: { status: res.status, headers: res.headers as unknown as Headers, body: null, tooLarge: true } };
    }
    // Baca bertahap dan hentikan jika melebihi batas.
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    let tooLarge = false;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > FETCH_LIMITS.maxBytes) {
          tooLarge = true;
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    const body = tooLarge ? null : new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
    return { ok: true, res: { status: res.status, headers: res.headers as unknown as Headers, body, tooLarge } };
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) return { ok: false, reason: "timeout" };
    return { ok: false, reason: "network_error" };
  }
}

async function robotsAllows(url: URL, signal: AbortSignal): Promise<boolean> {
  const robotsUrl = new URL("/robots.txt", url.origin);
  const r = await safeGet(robotsUrl, signal, "text/plain");
  if (!r.ok || r.res.status !== 200 || !r.res.body) return true; // tidak ada robots.txt → diizinkan
  return isAllowedByRobots(r.res.body, url.pathname + url.search, "ZJobsAgentBot");
}

/**
 * Ambil isi halaman lowongan publik. Tidak memakai cookie/login, tidak mem-bypass captcha/paywall.
 * Gagal → pemanggil meminta pengguna menempel teks (status needs_input).
 */
export async function fetchJobPost(rawUrl: string): Promise<FetchResult> {
  const valid = validateJobUrl(rawUrl);
  if (!valid.ok) return { status: "blocked", reason: valid.reason };

  const signal = AbortSignal.timeout(FETCH_LIMITS.timeoutMs);
  let current = valid.url;

  try {
    if (!(await robotsAllows(current, signal))) return { status: "blocked", reason: "robots_disallowed", finalUrl: current.toString() };

    for (let hop = 0; hop <= FETCH_LIMITS.maxRedirects; hop++) {
      const r = await safeGet(current, signal, "text/html,application/xhtml+xml,text/plain;q=0.8");
      if (!r.ok) return { status: r.reason === "private_address" ? "blocked" : "failed", reason: r.reason, finalUrl: current.toString() };
      const { res } = r;

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return { status: "failed", reason: "http_error", finalUrl: current.toString() };
        const next = validateJobUrl(new URL(location, current).toString());
        if (!next.ok) return { status: "blocked", reason: next.reason, finalUrl: current.toString() };
        if (next.url.origin !== current.origin && !(await robotsAllows(next.url, signal))) {
          return { status: "blocked", reason: "robots_disallowed", finalUrl: next.url.toString() };
        }
        current = next.url;
        continue;
      }
      if (res.status === 401 || res.status === 403 || res.status === 407) return { status: "blocked", reason: "login_or_forbidden", finalUrl: current.toString() };
      if (res.status !== 200) return { status: "failed", reason: "http_error", finalUrl: current.toString() };
      if (res.tooLarge || res.body == null) return { status: "failed", reason: "too_large", finalUrl: current.toString() };

      const type = (res.headers.get("content-type") ?? "").toLowerCase();
      let text: string;
      let title: string | null = null;
      let hiddenRemoved = 0;
      if (type.includes("text/html") || type.includes("xhtml")) {
        const extracted = htmlToVisibleText(res.body, { readability: true });
        ({ text, title, hiddenRemoved } = extracted);
      } else if (type.includes("text/plain")) {
        text = normalizeText(res.body);
      } else {
        return { status: "failed", reason: "unsupported_type", finalUrl: current.toString() };
      }

      if (text.length < MIN_MEANINGFUL_CHARS) return { status: "failed", reason: "empty_content", finalUrl: current.toString() };
      const truncated = text.length > MAX_FETCHED_CHARS;
      return { status: "ok", finalUrl: current.toString(), title, text: truncated ? text.slice(0, MAX_FETCHED_CHARS) : text, truncated, hiddenRemoved };
    }
    return { status: "failed", reason: "too_many_redirects", finalUrl: current.toString() };
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) return { status: "failed", reason: "timeout" };
    return { status: "failed", reason: "network_error" };
  }
}
