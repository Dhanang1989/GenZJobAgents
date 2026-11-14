import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ParsedBetaMessage } from "@anthropic-ai/sdk/lib/beta-parser";
import type { z } from "zod";
import { env } from "@/lib/env";
import { estimateCostUsd, type TokenUsage } from "@/lib/agents/pricing";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    // maxRetries: SDK mengulang 408/409/429/5xx & error koneksi dengan backoff (blueprint 04 §10).
    client = new Anthropic({ apiKey: env.anthropicApiKey, maxRetries: 2, timeout: 120_000 });
  }
  return client;
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type CallMeta = {
  model: string;
  stop_reason: string | null;
  usage: TokenUsage;
  cost_usd: number | null;
  latency_ms: number;
  attempts: number;
  fallback_used: boolean;
};

export type StructuredFailure = "not_configured" | "refusal" | "max_tokens" | "invalid_output" | "rate_limited" | "api_error";

export type StructuredResult<T> =
  | { ok: true; data: T; meta: CallMeta }
  | { ok: false; reason: StructuredFailure; message: string; meta?: CallMeta };

export type StructuredCall<S extends z.ZodType> = {
  system: string;
  user: string;
  schema: S;
  model: string;
  effort: Effort;
  maxTokens?: number;
  /** Validasi tambahan setelah parse (mis. rentang angka). Kembalikan pesan error atau null. */
  validate?: (data: z.infer<S>) => string | null;
};

/**
 * Satu panggilan agen dengan structured outputs.
 * - Prompt sistem diberi cache_control (prefix statis).
 * - Server-side fallback ("default") untuk stop_reason refusal.
 * - 1x repair retry jika output gagal divalidasi.
 */
export async function callStructured<S extends z.ZodType>(call: StructuredCall<S>): Promise<StructuredResult<z.infer<S>>> {
  if (!env.anthropicApiKey) return { ok: false, reason: "not_configured", message: "ANTHROPIC_API_KEY belum diset" };

  const started = Date.now();
  let repairNote: string | null = null;
  let lastMeta: CallMeta | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response: ParsedBetaMessage<z.infer<S>> = await getClient().beta.messages.parse({
        model: call.model,
        max_tokens: call.maxTokens ?? 16_000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [{ type: "text", text: call.system, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: repairNote ? `${call.user}\n\nCatatan sistem: output sebelumnya tidak valid (${repairNote}). Perbaiki dan patuhi skema.` : call.user,
          },
        ],
        output_config: { effort: call.effort, format: betaZodOutputFormat(call.schema) },
      });

      const usage: TokenUsage = {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_read_input_tokens: response.usage.cache_read_input_tokens,
        cache_creation_input_tokens: response.usage.cache_creation_input_tokens,
      };
      const fallbackUsed = response.content.some((b) => b.type === "fallback");
      lastMeta = {
        model: response.model,
        stop_reason: response.stop_reason,
        usage,
        cost_usd: estimateCostUsd(response.model, usage),
        latency_ms: Date.now() - started,
        attempts: attempt,
        fallback_used: fallbackUsed,
      };

      // Selalu cek stop_reason sebelum membaca konten.
      if (response.stop_reason === "refusal") {
        return { ok: false, reason: "refusal", message: "Model menolak permintaan", meta: lastMeta };
      }
      if (response.stop_reason === "max_tokens") {
        return { ok: false, reason: "max_tokens", message: "Output terpotong (max_tokens)", meta: lastMeta };
      }

      const parsed: z.infer<S> | null = response.parsed_output;
      if (parsed == null) {
        repairNote = "JSON tidak sesuai skema";
        continue;
      }
      const problem: string | null = call.validate?.(parsed) ?? null;
      if (problem) {
        repairNote = problem;
        continue;
      }
      return { ok: true, data: parsed, meta: lastMeta };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        return { ok: false, reason: "rate_limited", message: "Batas laju API tercapai", meta: lastMeta };
      }
      if (err instanceof Anthropic.APIError) {
        return { ok: false, reason: "api_error", message: `API error ${err.status ?? "koneksi"}: ${err.message}`, meta: lastMeta };
      }
      // Error parsing JSON dari helper SDK → coba sekali lagi dengan catatan perbaikan.
      if (err instanceof SyntaxError || (err instanceof Error && /parse|json|schema/i.test(err.message))) {
        repairNote = "JSON tidak bisa diparsing";
        continue;
      }
      throw err;
    }
  }
  return { ok: false, reason: "invalid_output", message: `Output tetap tidak valid: ${repairNote}`, meta: lastMeta };
}
