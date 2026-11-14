import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import ipaddr from "ipaddr.js";
import { env } from "@/lib/env";

export const DEVICE_COOKIE = "zj_did";

/** Ambil IP klien dari header proxy (Vercel mengisi x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "0.0.0.0";
}

/** Kecilkan presisi IP (/24 untuk IPv4, /48 untuk IPv6) — cukup untuk rate limit, tidak untuk melacak orang. */
export function coarseIp(ip: string): string {
  if (!ipaddr.isValid(ip)) return "unknown";
  const addr = ipaddr.parse(ip);
  if (addr.kind() === "ipv4") return addr.toString().split(".").slice(0, 3).join(".") + ".0/24";
  return (addr as ipaddr.IPv6).toNormalizedString().split(":").slice(0, 3).join(":") + "::/48";
}

/**
 * Kunci tamu = HMAC(salt + tanggal, device_id + IP kasar).
 * Salt berganti harian sehingga kunci tidak bisa dipakai menautkan aktivitas lintas hari.
 */
export function guestKeyHash(deviceId: string, ip: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return createHmac("sha256", `${env.guestHashSalt}:${day}`).update(`${deviceId}|${coarseIp(ip)}`).digest("hex");
}

/** Kunci rate limit berbasis IP saja (menahan tamu yang menghapus cookie). */
export function ipKeyHash(ip: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return createHmac("sha256", `${env.guestHashSalt}:ip:${day}`).update(coarseIp(ip)).digest("hex");
}

export function newDeviceId(): string {
  return randomUUID();
}

export function isValidDeviceId(v: string | undefined): v is string {
  return Boolean(v && /^[0-9a-f-]{36}$/i.test(v));
}
