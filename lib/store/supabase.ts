import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { CachedAssessment, FeedbackRecord, JobPostRecord, ScamCheckRecord, ScamStore } from "@/lib/store/types";

/**
 * Store Supabase (service role, hanya dipakai di server). Skema: supabase/migrations/0001_init.sql.
 * Akses publik ke hasil cek loker HANYA lewat route server yang memasking kontak.
 */
let admin: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!admin) {
    admin = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Supabase ${what}: ${result.error.message}`);
  if (result.data == null) throw new Error(`Supabase ${what}: data kosong`);
  return result.data;
}

export function createSupabaseStore(): ScamStore {
  return {
    kind: "supabase",
    async insertJobPost(post) {
      return must<JobPostRecord>(await db().from("job_posts").insert(post).select().single(), "insert job_posts");
    },
    async getJobPost(id) {
      const { data, error } = await db().from("job_posts").select().eq("id", id).maybeSingle();
      if (error) throw new Error(`Supabase get job_posts: ${error.message}`);
      return (data as JobPostRecord | null) ?? null;
    },
    async insertScamCheck(check) {
      return must<ScamCheckRecord>(await db().from("scam_checks").insert(check).select().single(), "insert scam_checks");
    },
    async getScamCheckByShareToken(token) {
      const { data, error } = await db().from("scam_checks").select().eq("share_token", token).maybeSingle();
      if (error) throw new Error(`Supabase get scam_checks: ${error.message}`);
      return (data as ScamCheckRecord | null) ?? null;
    },
    async getCachedAssessment(key) {
      const { data, error } = await db()
        .from("scam_cache")
        .select("payload")
        .eq("cache_key", key)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw new Error(`Supabase get scam_cache: ${error.message}`);
      return (data?.payload as CachedAssessment | undefined) ?? null;
    },
    async putCachedAssessment(key, contentHash, value, ttlSeconds) {
      const { error } = await db().from("scam_cache").upsert({
        cache_key: key,
        content_hash: contentHash,
        payload: value,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      });
      if (error) throw new Error(`Supabase put scam_cache: ${error.message}`);
    },
    async insertFeedback(feedback) {
      return must<FeedbackRecord>(await db().from("scam_feedback").insert(feedback).select().single(), "insert scam_feedback");
    },
  };
}
