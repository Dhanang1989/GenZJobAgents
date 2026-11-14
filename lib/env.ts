/**
 * Konfigurasi dari environment. Setiap integrasi opsional punya fallback lokal
 * agar app bisa dijalankan tanpa kredensial (mode pengembangan).
 */
function v(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const env = {
  anthropicApiKey: v("ANTHROPIC_API_KEY"),
  /** Keputusan K1: model per agen bisa diganti lewat env tanpa ubah kode. */
  agent1Model: v("AGENT1_MODEL") ?? "claude-opus-5-5",
  /** Anggaran harian token AI (USD). Lewat batas → cek loker jalan dalam mode aturan saja. */
  aiDailyBudgetUsd: Number(v("AI_DAILY_BUDGET_USD") ?? "10"),

  supabaseUrl: v("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: v("SUPABASE_SERVICE_ROLE_KEY"),

  upstashUrl: v("UPSTASH_REDIS_REST_URL"),
  upstashToken: v("UPSTASH_REDIS_REST_TOKEN"),

  turnstileSecret: v("TURNSTILE_SECRET_KEY"),
  turnstileSiteKey: v("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),

  guestHashSalt: v("GUEST_HASH_SALT") ?? "dev-only-salt-change-me",
  isProduction: process.env.NODE_ENV === "production",
};

export const features = {
  get llm() {
    return Boolean(env.anthropicApiKey);
  },
  get supabase() {
    return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
  },
  get upstash() {
    return Boolean(env.upstashUrl && env.upstashToken);
  },
  get turnstile() {
    return Boolean(env.turnstileSecret);
  },
};

/** Validasi konfigurasi produksi: lebih baik gagal start daripada diam-diam pakai fallback memori. */
export function assertProductionConfig(): void {
  if (!env.isProduction || process.env.ZJ_ALLOW_DEV_FALLBACKS === "1") return;
  const missing: string[] = [];
  if (!features.supabase) missing.push("NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
  if (!features.upstash) missing.push("UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN");
  if (!features.turnstile) missing.push("TURNSTILE_SECRET_KEY");
  if (env.guestHashSalt === "dev-only-salt-change-me") missing.push("GUEST_HASH_SALT");
  if (missing.length) throw new Error(`Konfigurasi produksi belum lengkap: ${missing.join(", ")}`);
}
