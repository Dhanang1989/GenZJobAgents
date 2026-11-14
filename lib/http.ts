import "server-only";
import { cookies, headers } from "next/headers";
import { env } from "@/lib/env";
import { clientIp, DEVICE_COOKIE, guestKeyHash, ipKeyHash, isValidDeviceId, newDeviceId } from "@/lib/security/guest";

export type ApiErrorCode =
  | "bad_request" | "invalid_url" | "too_short" | "too_long" | "empty" | "needs_text" | "rate_limited"
  | "captcha_failed" | "not_found" | "forbidden" | "internal";

/** Pesan ramah (Bahasa Indonesia) untuk setiap kode error. */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  bad_request: "Permintaan tidak valid.",
  invalid_url: "Link-nya tidak valid. Pastikan diawali https:// atau tempel teks lowongannya.",
  too_short: "Teks lowongannya terlalu pendek untuk dinilai. Tempel teks lengkapnya ya.",
  too_long: "Teksnya terlalu panjang (maks 8.000 karakter). Tempel bagian deskripsi & kualifikasinya saja.",
  empty: "Tempel teks lowongan atau masukkan link-nya dulu.",
  needs_text: "Halaman ini nggak bisa kami buka (mungkin perlu login atau diblokir). Tempel teks lowongannya di sini ya.",
  rate_limited: "Kamu sudah banyak melakukan cek hari ini. Istirahat dulu ya, lalu coba lagi nanti.",
  captcha_failed: "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.",
  not_found: "Data tidak ditemukan.",
  forbidden: "Akses ditolak.",
  internal: "Ada kendala teknis. Coba lagi sebentar lagi.",
};

export function apiError(code: ApiErrorCode, status: number, extra?: Record<string, unknown>): Response {
  return Response.json({ error: { code, message: ERROR_MESSAGES[code], ...extra } }, { status });
}

export type GuestContext = { ip: string; deviceId: string; guestKey: string; ipKey: string };

/** Identitas tamu (pseudonim) untuk rate limit. Menyetel cookie device bila belum ada. */
export async function guestContext(): Promise<GuestContext> {
  const jar = await cookies();
  const h = await headers();
  let deviceId = jar.get(DEVICE_COOKIE)?.value;
  if (!isValidDeviceId(deviceId)) {
    deviceId = newDeviceId();
    jar.set(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: "lax", secure: env.isProduction, path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const ip = clientIp(h);
  return { ip, deviceId, guestKey: guestKeyHash(deviceId, ip), ipKey: ipKeyHash(ip) };
}

/** Tolak permintaan lintas origin untuk endpoint yang mengubah data (lapisan tambahan di atas SameSite cookie). */
export async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true; // permintaan non-browser / navigasi biasa
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
