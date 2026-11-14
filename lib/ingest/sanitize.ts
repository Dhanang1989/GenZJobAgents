import { createHash } from "node:crypto";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

/** Batas panjang teks (blueprint 04 §4.1). Teks tidak pernah dipotong diam-diam. */
export const MAX_PASTED_CHARS = 8_000;
export const MAX_FETCHED_CHARS = 12_000;
export const MIN_MEANINGFUL_CHARS = 30;

// Zero-width, bidi override, BOM, soft hyphen, dan karakter kontrol lain yang bisa dipakai menyembunyikan teks.
const INVISIBLE_CHARS = /[­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ]/g;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Normalisasi teks lowongan: NFKC, buang karakter tak terlihat, rapikan spasi. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS, "")
    .replace(CONTROL_CHARS, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Versi untuk pencocokan pola & hash: huruf kecil + spasi tunggal. */
export function canonicalize(input: string): string {
  return normalizeText(input).toLowerCase().replace(/\s+/g, " ");
}

export function contentHash(text: string): string {
  return createHash("sha256").update(canonicalize(text)).digest("hex");
}

const HIDDEN_STYLE = /(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(\.\d+)?(px|em|rem|pt)?\s*(;|$)|opacity\s*:\s*0(\.0+)?\s*(;|$))/i;

/**
 * Ubah HTML menjadi teks yang terlihat manusia. Elemen tersembunyi dan komentar dibuang
 * karena sering dipakai menyisipkan instruksi untuk AI (prompt injection).
 */
export function htmlToVisibleText(html: string, opts: { readability?: boolean } = {}): { text: string; title: string | null; hiddenRemoved: number } {
  const { document } = parseHTML(html);
  let hiddenRemoved = 0;

  for (const el of Array.from(document.querySelectorAll("script,style,noscript,template,iframe,svg,canvas,head > *:not(title)"))) {
    el.remove();
  }
  for (const el of Array.from(document.querySelectorAll("[hidden],[aria-hidden='true'],[style],input[type='hidden']"))) {
    const style = el.getAttribute("style") ?? "";
    if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true" || el.getAttribute("type") === "hidden" || HIDDEN_STYLE.test(style)) {
      el.remove();
      hiddenRemoved++;
    }
  }

  const title = document.querySelector("title")?.textContent?.trim() || null;

  if (opts.readability) {
    // Fokus ke konten utama (buang navigasi/footer portal). Dijalankan SETELAH elemen tersembunyi dibuang.
    try {
      const clone = parseHTML(document.toString()).document;
      for (const el of Array.from(clone.querySelectorAll("br,p,div,li,h1,h2,h3,h4,h5,h6,tr"))) el.appendChild(clone.createTextNode("\n"));
      const article = new Readability(clone as unknown as Document).parse();
      const main = normalizeText(article?.textContent ?? "");
      if (main.length >= 200) return { text: main, title: article?.title?.trim() || title, hiddenRemoved };
    } catch {
      // jatuh ke teks body di bawah
    }
  }

  // Tambahkan baris baru pada elemen blok agar struktur tetap terbaca.
  for (const el of Array.from(document.querySelectorAll("br,p,div,li,h1,h2,h3,h4,h5,h6,tr,section,article"))) {
    el.appendChild(document.createTextNode("\n"));
  }
  const body = document.querySelector("body") ?? document.documentElement;
  const text = normalizeText(body?.textContent ?? "");
  return { text, title, hiddenRemoved };
}

// ---------------------------------------------------------------------------
// Sinyal dari URL & kontak (dipakai rule engine)
// ---------------------------------------------------------------------------

export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.co.id", "ymail.com", "outlook.com", "hotmail.com", "live.com",
  "icloud.com", "aol.com", "proton.me", "protonmail.com", "mail.com", "gmx.com", "yandex.com", "zoho.com",
]);

export const SHORTENER_DOMAINS = new Set([
  "bit.ly", "s.id", "tinyurl.com", "cutt.ly", "shorturl.at", "rebrand.ly", "t.ly", "rb.gy", "is.gd",
  "ow.ly", "goo.gl", "tiny.cc", "bitly.com", "short.io", "v.gd",
]);

const SOCIAL_OR_CHAT_DOMAINS = new Set([
  "wa.me", "api.whatsapp.com", "chat.whatsapp.com", "whatsapp.com", "t.me", "telegram.me", "telegram.org",
  "instagram.com", "facebook.com", "fb.com", "tiktok.com", "x.com", "twitter.com", "line.me",
]);

export type TextSignals = {
  urls: string[];
  domains: string[];
  emails: string[];
  freeEmailDomains: string[];
  companyEmailDomains: string[];
  phoneNumbers: string[];
  hasChatLink: boolean;
  shorteners: string[];
  apkLinks: string[];
  /** Domain situs selain media sosial/chat/shortener (indikasi ada situs perusahaan). */
  websiteDomains: string[];
};

const URL_RE = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s<>"')\]]*)?)/gi;
const EMAIL_RE = /\b[a-z0-9._%+-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/gi;
// Nomor HP Indonesia: 08xx / +62 8xx / 62 8xx, boleh dengan spasi/titik/strip.
const PHONE_RE = /(?:\+?62|\b0)[\s.-]?8\d{1,2}(?:[\s.-]?\d){6,10}\b/g;

function hostOf(raw: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function extractSignals(text: string, sourceUrl?: string | null): TextSignals {
  const emails = Array.from(text.matchAll(EMAIL_RE), (m) => m[0].toLowerCase());
  const emailDomains = new Set(Array.from(text.matchAll(EMAIL_RE), (m) => m[1].toLowerCase()));

  // URL tanpa bagian email (hindari "gmail.com" dari alamat email terbaca sebagai URL).
  const textWithoutEmails = text.replace(EMAIL_RE, " ");
  const urls = Array.from(textWithoutEmails.matchAll(URL_RE), (m) => m[1]).filter((u) => /[a-z]{2,}/i.test(u.split(".").pop() ?? ""));
  if (sourceUrl) urls.unshift(sourceUrl);

  const domains = Array.from(new Set(urls.map(hostOf).filter((h): h is string => Boolean(h))));
  const freeEmailDomains = [...emailDomains].filter((d) => FREE_EMAIL_DOMAINS.has(d));
  const companyEmailDomains = [...emailDomains].filter((d) => !FREE_EMAIL_DOMAINS.has(d));
  const shorteners = domains.filter((d) => SHORTENER_DOMAINS.has(d));
  const apkLinks = urls.filter((u) => /\.apk(\b|$|\?)/i.test(u));
  const hasChatLink = domains.some((d) => ["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "t.me", "telegram.me"].includes(d));
  const websiteDomains = domains.filter((d) => !SOCIAL_OR_CHAT_DOMAINS.has(d) && !SHORTENER_DOMAINS.has(d) && !FREE_EMAIL_DOMAINS.has(d));
  const phoneNumbers = Array.from(new Set(Array.from(text.matchAll(PHONE_RE), (m) => m[0].replace(/[\s.-]/g, ""))));

  return { urls, domains, emails, freeEmailDomains, companyEmailDomains, phoneNumbers, hasChatLink, shorteners, apkLinks, websiteDomains };
}

// ---------------------------------------------------------------------------
// Masking untuk tampilan publik (halaman hasil yang bisa dibagikan)
// ---------------------------------------------------------------------------

export function maskContacts(text: string): string {
  return text
    .replace(EMAIL_RE, (full) => {
      const [user, domain] = full.split("@");
      return `${user.slice(0, 1)}***@${domain}`;
    })
    .replace(PHONE_RE, (full) => {
      const digits = full.replace(/\D/g, "");
      return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
    });
}
