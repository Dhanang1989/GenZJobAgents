import { z } from "zod";
import { apiError, guestContext, isSameOrigin } from "@/lib/http";
import { toPublicView } from "@/lib/scam/publicView";
import { runScamCheck } from "@/lib/scam/service";
import { rateLimit } from "@/lib/security/ratelimit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { getStore } from "@/lib/store";

export const maxDuration = 60;

const Body = z.object({
  job_post_id: z.uuid(),
  turnstile_token: z.string().max(4096).optional().nullable(),
});

/** POST /api/scam-checks — cek loker cepat (tamu). Login baru ada di Minggu 2. */
export async function POST(request: Request) {
  if (!(await isSameOrigin())) return apiError("forbidden", 403);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("bad_request", 400);

  const guest = await guestContext();
  if (!(await verifyTurnstile(parsed.data.turnstile_token, guest.ip))) return apiError("captcha_failed", 403);

  // Batas per perangkat + per IP (menahan tamu yang menghapus cookie).
  for (const [name, key] of [["guestScamPerMinute", guest.guestKey], ["guestScamPerDay", guest.guestKey], ["guestScamPerDay", guest.ipKey]] as const) {
    const rl = await rateLimit(name, key);
    if (!rl.success) return apiError("rate_limited", 429, { reset: rl.reset });
  }

  try {
    const store = getStore();
    const post = await store.getJobPost(parsed.data.job_post_id);
    if (!post) return apiError("not_found", 404);
    if (post.guest_key_hash && post.guest_key_hash !== guest.guestKey) return apiError("forbidden", 403);

    const check = await runScamCheck(post, { guestKeyHash: guest.guestKey });
    return Response.json({ scam_check: toPublicView(check, post) });
  } catch (err) {
    console.error("[api/scam-checks]", err);
    return apiError("internal", 500);
  }
}
