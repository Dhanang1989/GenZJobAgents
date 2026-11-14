import { z } from "zod";
import { apiError, guestContext, isSameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/security/ratelimit";
import { getStore } from "@/lib/store";

const Body = z.object({
  claim: z.enum(["false_positive", "false_negative"]),
  evidence_text: z.string().trim().min(10).max(2000),
});

/**
 * POST /api/public/scam-checks/:shareToken/feedback — "Laporkan salah deteksi".
 * Status hasil TIDAK berubah otomatis; masuk antrean tinjauan manual (blueprint 02 §3).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/public/scam-checks/[shareToken]/feedback">) {
  if (!(await isSameOrigin())) return apiError("forbidden", 403);
  const { shareToken } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("bad_request", 400);

  const guest = await guestContext();
  const rl = await rateLimit("feedbackPerDay", guest.guestKey);
  if (!rl.success) return apiError("rate_limited", 429);

  const store = getStore();
  const check = await store.getScamCheckByShareToken(shareToken).catch(() => null);
  if (!check) return apiError("not_found", 404);

  await store.insertFeedback({ scam_check_id: check.id, claim: parsed.data.claim, evidence_text: parsed.data.evidence_text });
  return Response.json({ status: "pending" });
}
