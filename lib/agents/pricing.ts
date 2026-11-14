/**
 * Harga daftar Anthropic API (USD per 1 juta token) saat penulisan blueprint.
 * WAJIB dicek ulang sebelum launch. Produksi: pindahkan ke tabel `price_table` (blueprint 05 §3).
 */
export const PRICE_TABLE_VERSION = "2026-10";

type Price = { input: number; output: number; cacheRead: number; cacheWrite: number };

const PRICES: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  // Harga cache Haiku 5.5 tidak tercantum di sumber kami: dianggap sama dengan input (batas atas).
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.1, cacheWrite: 0.125 },
};

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const price = PRICES[model] ?? Object.entries(PRICES).find(([id]) => model.startsWith(id))?.[1];
  if (!price) return null;
  const perToken = (usd: number) => usd / 1_000_000;
  return (
    usage.input_tokens * perToken(price.input) +
    usage.output_tokens * perToken(price.output) +
    (usage.cache_read_input_tokens ?? 0) * perToken(price.cacheRead) +
    (usage.cache_creation_input_tokens ?? 0) * perToken(price.cacheWrite)
  );
}
