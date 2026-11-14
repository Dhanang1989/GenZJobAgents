import "server-only";
import { createHash } from "node:crypto";
import { runAgent1QuickScam } from "@/lib/agents/agent1";
import { AGENT1_PROMPT_VERSION } from "@/lib/agents/prompts/agent1.v1";
import type { JobSummary, ScamAssessment } from "@/lib/agents/schemas/agent1";
import { env, features } from "@/lib/env";
import { fetchJobPost, validateJobUrl, type FetchResult } from "@/lib/ingest/fetchJobPost";
import { contentHash, MAX_PASTED_CHARS, MIN_MEANINGFUL_CHARS, normalizeText } from "@/lib/ingest/sanitize";
import { addAiSpend, aiBudgetExceeded } from "@/lib/security/ratelimit";
import { decideGate } from "@/lib/scam/gate";
import { RULES_VERSION, runRules, type UserReported } from "@/lib/scam/rules";
import { getStore } from "@/lib/store";
import type { JobPostRecord, ScamCheckRecord } from "@/lib/store/types";

export const SCAM_CACHE_TTL_SECONDS = 7 * 24 * 3600; // [ASUMSI] blueprint 04 §5.5

export type IngestInput = {
  url?: string | null;
  text?: string | null;
  userReported?: UserReported;
  guestKeyHash: string | null;
};

export type IngestResult =
  | { ok: true; jobPost: JobPostRecord; fetch: FetchResult | null }
  | { ok: false; code: "needs_text"; fetch: FetchResult }
  | { ok: false; code: "invalid_url" | "too_short" | "too_long" | "empty" };

/** Langkah 0: ambil/sanitasi lowongan lalu simpan (blueprint 04 §4.1). */
export async function ingestJobPost(input: IngestInput): Promise<IngestResult> {
  const pasted = input.text ? normalizeText(input.text) : "";
  const rawUrl = input.url?.trim() || null;

  if (pasted.length > MAX_PASTED_CHARS) return { ok: false, code: "too_long" };

  let fetchResult: FetchResult | null = null;
  let sourceUrl: string | null = null;
  let domain: string | null = null;
  let text = pasted;
  let title: string | null = null;
  let truncated = false;

  if (rawUrl) {
    const valid = validateJobUrl(rawUrl);
    if (!valid.ok) {
      if (!pasted) return { ok: false, code: "invalid_url" };
    } else {
      sourceUrl = valid.url.toString();
      domain = valid.url.hostname.replace(/^www\./, "");
      // Teks tempel pengguna lebih dipercaya daripada hasil fetch; URL tetap dipakai sebagai sinyal.
      if (!pasted) {
        fetchResult = await fetchJobPost(sourceUrl);
        if (fetchResult.status !== "ok" || !fetchResult.text) return { ok: false, code: "needs_text", fetch: fetchResult };
        text = fetchResult.text;
        title = fetchResult.title ?? null;
        truncated = Boolean(fetchResult.truncated);
        if (fetchResult.finalUrl) domain = new URL(fetchResult.finalUrl).hostname.replace(/^www\./, "");
      }
    }
  }

  if (!text) return { ok: false, code: "empty" };
  if (text.length < MIN_MEANINGFUL_CHARS) return { ok: false, code: "too_short" };

  const jobPost = await getStore().insertJobPost({
    created_by: null,
    guest_key_hash: input.guestKeyHash,
    source: sourceUrl && !pasted ? "url" : "text",
    source_url: sourceUrl,
    domain,
    content_hash: contentHash(text),
    sanitized_text: text,
    title,
    fetch_status: fetchResult ? fetchResult.status : "n/a",
    truncated,
    user_reported: input.userReported ?? {},
  });
  return { ok: true, jobPost, fetch: fetchResult };
}

function cacheKey(post: JobPostRecord): string {
  const reported = JSON.stringify({ c: post.user_reported.recruiter_contact_type ?? null, p: post.user_reported.asked_to_pay ?? null });
  return createHash("sha256")
    .update([post.content_hash, post.domain ?? "", RULES_VERSION, AGENT1_PROMPT_VERSION, env.agent1Model, reported].join("|"))
    .digest("hex");
}

/** Cek loker cepat (mode quick_scam): aturan → (cache | Agen 1) → gerbang → simpan. */
export async function runScamCheck(post: JobPostRecord, opts: { guestKeyHash: string | null; userId?: string | null }): Promise<ScamCheckRecord> {
  const store = getStore();
  const ruleHits = runRules({ text: post.sanitized_text, sourceUrl: post.source_url, userReported: post.user_reported });

  let assessment: ScamAssessment | null = null;
  let jobSummary: JobSummary | null = null;
  let highlights: string[] = [];
  let model: string | null = null;
  let promptVersion: string | null = null;
  let fromCache = false;
  let costUsd: number | null = null;
  let degradedReason: string | null = null;

  const key = cacheKey(post);
  const cached = await store.getCachedAssessment(key);
  if (cached) {
    ({ assessment, job_summary: jobSummary, timeline_highlights: highlights, model, prompt_version: promptVersion } = cached);
    fromCache = true;
  } else if (!features.llm) {
    degradedReason = "ai_not_configured";
  } else if (await aiBudgetExceeded()) {
    degradedReason = "ai_daily_budget_exceeded";
  } else {
    const result = await runAgent1QuickScam({ text: post.sanitized_text, sourceDomain: post.domain, userReported: post.user_reported, ruleHits });
    costUsd = result.meta?.cost_usd ?? null;
    if (costUsd) await addAiSpend(costUsd);
    if (result.ok) {
      assessment = result.output.scam_assessment;
      jobSummary = result.output.job_summary;
      highlights = result.output.timeline_highlights;
      model = result.meta.model;
      promptVersion = result.promptVersion;
      await store.putCachedAssessment(key, post.content_hash, { assessment, job_summary: jobSummary, timeline_highlights: highlights, model, prompt_version: promptVersion }, SCAM_CACHE_TTL_SECONDS);
    } else {
      degradedReason = `ai_${result.reason}`;
      console.warn(`[scam-check] Agen 1 gagal (${result.reason}): ${result.message}`);
    }
  }

  const gate = decideGate(ruleHits, assessment);
  return store.insertScamCheck({
    job_post_id: post.id,
    user_id: opts.userId ?? null,
    guest_key_hash: opts.guestKeyHash,
    mode: "quick_scam",
    verdict: gate.verdict,
    risk_score: gate.risk,
    rule_score: gate.rule_score,
    rule_hits: ruleHits,
    gate,
    llm_assessment: assessment,
    job_summary: jobSummary,
    timeline_highlights: highlights,
    rules_version: RULES_VERSION,
    prompt_version: promptVersion,
    model,
    from_cache: fromCache,
    degraded: gate.degraded,
    degraded_reason: degradedReason,
    cost_usd: costUsd,
  });
}
