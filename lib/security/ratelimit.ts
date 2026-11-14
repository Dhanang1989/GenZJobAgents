import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, features } from "@/lib/env";

/** Batas awal [ASUMSI] (blueprint 07 §5). */
export const LIMITS = {
  guestScamPerDay: { limit: 5, window: "1 d" },
  guestScamPerMinute: { limit: 2, window: "1 m" },
  guestFetchPerHour: { limit: 5, window: "1 h" },
  feedbackPerDay: { limit: 10, window: "1 d" },
} as const;

type Window = `${number} ${"s" | "m" | "h" | "d"}`;
export type LimitName = keyof typeof LIMITS;
export type LimitResult = { success: boolean; remaining: number; reset: number };

function windowMs(w: Window): number {
  const [n, unit] = w.split(" ") as [string, "s" | "m" | "h" | "d"];
  return Number(n) * { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
}

// ---------------------------------------------------------------------------
// Implementasi memori (dev/tes): sliding window log sederhana.
// ---------------------------------------------------------------------------
const g = globalThis as unknown as { __zjRate?: Map<string, number[]>; __zjSpend?: Map<string, number> };

function memoryLimit(key: string, limit: number, w: Window): LimitResult {
  g.__zjRate ??= new Map();
  const now = Date.now();
  const ms = windowMs(w);
  const hits = (g.__zjRate.get(key) ?? []).filter((t) => t > now - ms);
  const success = hits.length < limit;
  if (success) hits.push(now);
  g.__zjRate.set(key, hits);
  return { success, remaining: Math.max(0, limit - hits.length), reset: (hits[0] ?? now) + ms };
}

// ---------------------------------------------------------------------------
let redis: Redis | null = null;
const limiters = new Map<LimitName, Ratelimit>();

function upstash(name: LimitName): Ratelimit {
  redis ??= new Redis({ url: env.upstashUrl!, token: env.upstashToken! });
  let rl = limiters.get(name);
  if (!rl) {
    const cfg = LIMITS[name];
    rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(cfg.limit, cfg.window as Window), prefix: `zj:rl:${name}` });
    limiters.set(name, rl);
  }
  return rl;
}

export async function rateLimit(name: LimitName, key: string): Promise<LimitResult> {
  const cfg = LIMITS[name];
  if (!features.upstash) return memoryLimit(`${name}:${key}`, cfg.limit, cfg.window as Window);
  const r = await upstash(name).limit(key);
  return { success: r.success, remaining: r.remaining, reset: r.reset };
}

// ---------------------------------------------------------------------------
// Anggaran harian token AI (blueprint 07 §5 "perlindungan biaya").
// ---------------------------------------------------------------------------
function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getAiSpendToday(): Promise<number> {
  if (!features.upstash) return g.__zjSpend?.get(dayKey()) ?? 0;
  redis ??= new Redis({ url: env.upstashUrl!, token: env.upstashToken! });
  return Number((await redis.get<number>(`zj:ai_spend:${dayKey()}`)) ?? 0);
}

export async function addAiSpend(usd: number): Promise<void> {
  if (!Number.isFinite(usd) || usd <= 0) return;
  if (!features.upstash) {
    g.__zjSpend ??= new Map();
    g.__zjSpend.set(dayKey(), (g.__zjSpend.get(dayKey()) ?? 0) + usd);
    return;
  }
  redis ??= new Redis({ url: env.upstashUrl!, token: env.upstashToken! });
  const key = `zj:ai_spend:${dayKey()}`;
  await redis.incrbyfloat(key, usd);
  await redis.expire(key, 3 * 86_400);
}

export async function aiBudgetExceeded(): Promise<boolean> {
  return (await getAiSpendToday()) >= env.aiDailyBudgetUsd;
}
