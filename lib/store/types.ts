import type { JobSummary, ScamAssessment, Verdict } from "@/lib/agents/schemas/agent1";
import type { GateDecision } from "@/lib/scam/gate";
import type { RuleHit, UserReported } from "@/lib/scam/rules";
import type { FetchResult } from "@/lib/ingest/fetchJobPost";

export type JobPostRecord = {
  id: string;
  created_at: string;
  created_by: string | null;
  guest_key_hash: string | null;
  source: "url" | "text";
  source_url: string | null;
  domain: string | null;
  content_hash: string;
  sanitized_text: string;
  title: string | null;
  fetch_status: FetchResult["status"] | "n/a";
  truncated: boolean;
  user_reported: UserReported;
};

export type ScamCheckRecord = {
  id: string;
  share_token: string;
  created_at: string;
  job_post_id: string;
  user_id: string | null;
  guest_key_hash: string | null;
  mode: "quick_scam" | "full";
  verdict: Verdict;
  risk_score: number;
  rule_score: number;
  rule_hits: RuleHit[];
  gate: GateDecision;
  llm_assessment: ScamAssessment | null;
  job_summary: JobSummary | null;
  timeline_highlights: string[];
  rules_version: string;
  prompt_version: string | null;
  model: string | null;
  from_cache: boolean;
  degraded: boolean;
  /** Alasan AI tidak dipakai (mode aturan saja), untuk log & UI. */
  degraded_reason: string | null;
  cost_usd: number | null;
};

export type CachedAssessment = {
  assessment: ScamAssessment;
  job_summary: JobSummary;
  timeline_highlights: string[];
  model: string;
  prompt_version: string;
};

export type FeedbackRecord = {
  id: string;
  created_at: string;
  scam_check_id: string;
  claim: "false_positive" | "false_negative";
  evidence_text: string;
  status: "pending" | "accepted" | "rejected";
};

export type NewJobPost = Omit<JobPostRecord, "id" | "created_at">;
export type NewScamCheck = Omit<ScamCheckRecord, "id" | "created_at" | "share_token">;
export type NewFeedback = Omit<FeedbackRecord, "id" | "created_at" | "status">;

export interface ScamStore {
  readonly kind: "memory" | "supabase";
  insertJobPost(post: NewJobPost): Promise<JobPostRecord>;
  getJobPost(id: string): Promise<JobPostRecord | null>;
  insertScamCheck(check: NewScamCheck): Promise<ScamCheckRecord>;
  getScamCheckByShareToken(token: string): Promise<ScamCheckRecord | null>;
  getCachedAssessment(key: string): Promise<CachedAssessment | null>;
  putCachedAssessment(key: string, contentHash: string, value: CachedAssessment, ttlSeconds: number): Promise<void>;
  insertFeedback(feedback: NewFeedback): Promise<FeedbackRecord>;
}
