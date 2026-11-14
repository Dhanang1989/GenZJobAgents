import { apiError } from "@/lib/http";
import { toPublicView } from "@/lib/scam/publicView";
import { getStore } from "@/lib/store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/public/scam-checks/:shareToken — versi aman (kontak dimasking, tanpa data tamu). */
export async function GET(_req: Request, ctx: RouteContext<"/api/public/scam-checks/[shareToken]">) {
  const { shareToken } = await ctx.params;
  if (!UUID_RE.test(shareToken)) return apiError("not_found", 404);
  const store = getStore();
  const check = await store.getScamCheckByShareToken(shareToken);
  if (!check) return apiError("not_found", 404);
  const post = await store.getJobPost(check.job_post_id);
  return Response.json({ scam_check: toPublicView(check, post) });
}
