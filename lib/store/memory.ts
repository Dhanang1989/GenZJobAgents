import { randomUUID } from "node:crypto";
import type { CachedAssessment, FeedbackRecord, JobPostRecord, NewFeedback, NewJobPost, NewScamCheck, ScamCheckRecord, ScamStore } from "@/lib/store/types";

/**
 * Store in-memory untuk pengembangan lokal & tes (tanpa Supabase).
 * Data hilang saat server restart. JANGAN dipakai di produksi (lihat assertProductionConfig).
 */
type MemoryState = {
  jobPosts: Map<string, JobPostRecord>;
  checks: Map<string, ScamCheckRecord>;
  checksByToken: Map<string, string>;
  cache: Map<string, { value: CachedAssessment; expiresAt: number }>;
  feedback: Map<string, FeedbackRecord>;
};

const g = globalThis as unknown as { __zjMemoryStore?: MemoryState };

function state(): MemoryState {
  g.__zjMemoryStore ??= { jobPosts: new Map(), checks: new Map(), checksByToken: new Map(), cache: new Map(), feedback: new Map() };
  return g.__zjMemoryStore;
}

export function createMemoryStore(): ScamStore {
  return {
    kind: "memory",
    async insertJobPost(post: NewJobPost) {
      const record: JobPostRecord = { ...post, id: randomUUID(), created_at: new Date().toISOString() };
      state().jobPosts.set(record.id, record);
      return record;
    },
    async getJobPost(id) {
      return state().jobPosts.get(id) ?? null;
    },
    async insertScamCheck(check: NewScamCheck) {
      const record: ScamCheckRecord = { ...check, id: randomUUID(), share_token: randomUUID(), created_at: new Date().toISOString() };
      state().checks.set(record.id, record);
      state().checksByToken.set(record.share_token, record.id);
      return record;
    },
    async getScamCheckByShareToken(token) {
      const id = state().checksByToken.get(token);
      return id ? state().checks.get(id) ?? null : null;
    },
    async getCachedAssessment(key) {
      const hit = state().cache.get(key);
      if (!hit) return null;
      if (hit.expiresAt < Date.now()) {
        state().cache.delete(key);
        return null;
      }
      return hit.value;
    },
    async putCachedAssessment(key, _contentHash, value, ttlSeconds) {
      state().cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    async insertFeedback(feedback: NewFeedback) {
      const record: FeedbackRecord = { ...feedback, id: randomUUID(), created_at: new Date().toISOString(), status: "pending" };
      state().feedback.set(record.id, record);
      return record;
    },
  };
}

/** Hanya untuk tes. */
export function resetMemoryStore(): void {
  delete g.__zjMemoryStore;
}
