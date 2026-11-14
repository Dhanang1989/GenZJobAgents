import { canonicalize } from "@/lib/ingest/sanitize";
import type { Agent1QuickScamOutput } from "@/lib/agents/schemas/agent1";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** Kutipan dianggap valid jika (setelah kanonisasi) benar-benar ada di teks lowongan. */
export function quoteAppearsIn(quote: string, sourceText: string): boolean {
  const q = canonicalize(quote).replace(/^["'“”‘’…\s.]+|["'“”‘’…\s.]+$/g, "");
  if (q.length < 4) return false;
  return canonicalize(sourceText).includes(q);
}

/**
 * Pasca-proses output Agen 1:
 * - Red flag tanpa kutipan yang benar-benar ada di teks dibuang (anti-halusinasi bukti).
 * - Skor di-clamp ke 0–100, panjang teks & array dibatasi.
 */
export function normalizeAgent1Output(raw: Agent1QuickScamOutput, sourceText: string): { output: Agent1QuickScamOutput; droppedFlags: number } {
  const a = raw.scam_assessment;
  const redFlags = a.red_flags.filter((f) => quoteAppearsIn(f.evidence_quote, sourceText));
  const output: Agent1QuickScamOutput = {
    job_summary: { ...raw.job_summary, title: cut(raw.job_summary.title || "Lowongan tanpa judul", 120) },
    scam_assessment: {
      ...a,
      llm_risk_score: clamp(a.llm_risk_score, 0, 100),
      red_flags: redFlags.slice(0, 8).map((f) => ({
        ...f,
        title: cut(f.title, 80),
        explanation: cut(f.explanation, 400),
        evidence_quote: cut(f.evidence_quote, 220),
      })),
      green_flags: a.green_flags.slice(0, 6).map((g) => ({
        title: cut(g.title, 120),
        evidence_quote: g.evidence_quote && quoteAppearsIn(g.evidence_quote, sourceText) ? cut(g.evidence_quote, 220) : null,
      })),
      cannot_verify: a.cannot_verify.slice(0, 6).map((s) => cut(s, 200)),
      user_safety_tips: a.user_safety_tips.slice(0, 4).map((s) => cut(s, 200)),
    },
    timeline_highlights: raw.timeline_highlights.slice(0, 5).map((s) => cut(s, 100)),
  };
  return { output, droppedFlags: a.red_flags.length - redFlags.length };
}
