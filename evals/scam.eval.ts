/**
 * Eval cek loker (blueprint 04 §11, `scam_eval`).
 *
 *   npm run eval:scam                 → mode aturan saja (gratis, tanpa API)
 *   EVAL_USE_LLM=1 npm run eval:scam  → memakai Agen 1 sungguhan (BERBIAYA, butuh ANTHROPIC_API_KEY)
 *
 * Target lulus (mode AI): recall PALSU ≥ 0,90 dan false-PALSU pada loker AMAN ≤ 5%.
 * Mode aturan saja tidak bisa memberi AMAN, jadi hanya recall PALSU & false-PALSU yang dinilai.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Verdict } from "@/lib/agents/schemas/agent1";

type Sample = { id: string; label: Verdict; note: string; text: string };

const DATASET = fileURLToPath(new URL("./datasets/scam/v0.jsonl", import.meta.url));
const samples: Sample[] = readFileSync(DATASET, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const useLlm = process.env.EVAL_USE_LLM === "1";

describe(`scam eval v0 (${samples.length} sampel, mode ${useLlm ? "AI" : "aturan saja"})`, () => {
  it("memenuhi target", async () => {
    if (!useLlm) process.env.ANTHROPIC_API_KEY = "";
    const { ingestJobPost, runScamCheck } = await import("@/lib/scam/service");

    const rows: { id: string; label: Verdict; got: Verdict; note: string; cost: number }[] = [];
    for (const s of samples) {
      const ingest = await ingestJobPost({ text: s.text, guestKeyHash: "eval" });
      if (!ingest.ok) throw new Error(`${s.id}: ingest gagal (${ingest.code})`);
      const check = await runScamCheck(ingest.jobPost, { guestKeyHash: "eval" });
      rows.push({ id: s.id, label: s.label, got: check.verdict, note: s.note, cost: check.cost_usd ?? 0 });
    }

    const palsu = rows.filter((r) => r.label === "PALSU");
    const aman = rows.filter((r) => r.label === "AMAN");
    const recallPalsu = palsu.filter((r) => r.got === "PALSU").length / palsu.length;
    const falsePalsuOnAman = aman.filter((r) => r.got === "PALSU").length / aman.length;
    const exact = rows.filter((r) => r.got === r.label).length / rows.length;
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);

    console.table(rows.map(({ id, label, got, note }) => ({ id, label, got, ok: got === label ? "✓" : "✗", note })));
    console.log(
      `recall PALSU: ${(recallPalsu * 100).toFixed(0)}% · false-PALSU pada AMAN: ${(falsePalsuOnAman * 100).toFixed(0)}% · akurasi persis: ${(exact * 100).toFixed(0)}%` +
        (useLlm ? ` · biaya: $${totalCost.toFixed(4)}` : ""),
    );

    expect(recallPalsu).toBeGreaterThanOrEqual(0.9);
    expect(falsePalsuOnAman).toBeLessThanOrEqual(0.05);
  }, 600_000);
});
