import "server-only";
import { env, features } from "@/lib/env";

/**
 * Verifikasi token Cloudflare Turnstile. Jika TURNSTILE_SECRET_KEY tidak diset (dev),
 * verifikasi dilewati. Produksi diwajibkan lewat assertProductionConfig().
 */
export async function verifyTurnstile(token: string | undefined | null, ip: string): Promise<boolean> {
  if (!features.turnstile) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: env.turnstileSecret!, response: token, remoteip: ip });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
