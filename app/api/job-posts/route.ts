import { z } from "zod";
import { apiError, guestContext, isSameOrigin } from "@/lib/http";
import { ingestJobPost } from "@/lib/scam/service";
import { rateLimit } from "@/lib/security/ratelimit";

export const maxDuration = 30;

const Body = z.object({
  url: z.string().max(2048).optional().nullable(),
  text: z.string().max(20_000).optional().nullable(),
  recruiter_contact_type: z.enum(["wa", "telegram", "email_gratis", "email_domain", "lainnya"]).optional().nullable(),
  asked_to_pay: z.boolean().optional().nullable(),
});

/** POST /api/job-posts — Langkah 0: ambil link (jika ada) + sanitasi + simpan. */
export async function POST(request: Request) {
  if (!(await isSameOrigin())) return apiError("forbidden", 403);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("bad_request", 400);
  const { url, text, recruiter_contact_type, asked_to_pay } = parsed.data;
  if (!url?.trim() && !text?.trim()) return apiError("empty", 400);

  const guest = await guestContext();
  if (url?.trim() && !text?.trim()) {
    const rl = await rateLimit("guestFetchPerHour", guest.guestKey);
    if (!rl.success) return apiError("rate_limited", 429);
  }

  try {
    const result = await ingestJobPost({
      url,
      text,
      userReported: { recruiter_contact_type: recruiter_contact_type ?? null, asked_to_pay: asked_to_pay ?? null },
      guestKeyHash: guest.guestKey,
    });
    if (!result.ok) {
      if (result.code === "needs_text") return apiError("needs_text", 422, { needs_text: true, fetch_reason: result.fetch.reason ?? null });
      return apiError(result.code, 400);
    }
    const { jobPost, fetch } = result;
    return Response.json({
      job_post_id: jobPost.id,
      fetch_status: jobPost.fetch_status,
      truncated: jobPost.truncated,
      hidden_removed: fetch?.hiddenRemoved ?? 0,
      preview: jobPost.sanitized_text.slice(0, 280),
    });
  } catch (err) {
    console.error("[api/job-posts]", err);
    return apiError("internal", 500);
  }
}
