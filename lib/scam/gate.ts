import type { ScamAssessment, Verdict } from "@/lib/agents/schemas/agent1";
import type { RuleHit } from "@/lib/scam/rules";

/** Ambang awal [ASUMSI] — dikalibrasi dengan evals/datasets/scam (blueprint 04 §5.5). */
export const GATE_THRESHOLDS = { palsu: 70, waspada: 35 } as const;
export const GATE_WEIGHTS = { rules: 0.4, llm: 0.6 } as const;

export type GateReason =
  | "hard_signal"
  | "combined_score"
  | "info_minim"
  | "llm_palsu_low_score"
  | "ai_unavailable"
  | "no_signal";

export type GateDecision = {
  verdict: Verdict;
  risk: number;
  rule_score: number;
  reason: GateReason;
  /** Rule yang dihitung (tidak dibantah LLM). */
  counted_rules: RuleHit["rule_id"][];
  /** Rule yang dibantah LLM dan bantahannya diterima. */
  refuted_rules: RuleHit["rule_id"][];
  /** Perlu ditinjau manusia (mis. LLM bilang PALSU tapi skor rendah). */
  flag_for_review: boolean;
  /** true jika keputusan dibuat tanpa AI (mode aturan saja). */
  degraded: boolean;
};

/**
 * Keputusan gerbang scam. Dijalankan oleh KODE, bukan LLM, sehingga lowongan berisi
 * prompt injection tidak bisa "membujuk" gerbang.
 *
 * @param assessment hasil Agen 1, atau null jika AI tidak tersedia (mode aturan saja).
 */
export function decideGate(rules: RuleHit[], assessment: ScamAssessment | null): GateDecision {
  const injectionDetected = rules.some((r) => r.rule_id === "R10_INJECTION") ||
    Boolean(assessment?.red_flags.some((f) => f.code === "instruksi_tersembunyi_untuk_ai"));

  // Bantahan LLM atas sebuah rule hanya diterima jika TIDAK ada indikasi injection.
  const refuted = new Set<RuleHit["rule_id"]>();
  if (assessment && !injectionDetected) {
    for (const review of assessment.rule_signal_review) {
      if (review.confirmed === false) refuted.add(review.rule_id as RuleHit["rule_id"]);
    }
  }
  // Laporan pengguna sendiri ("diminta bayar") tidak bisa dibantah oleh LLM.
  refuted.delete("R11_USER_PAY");

  const counted = rules.filter((r) => !refuted.has(r.rule_id));
  const ruleScoreValue = Math.min(100, counted.reduce((s, r) => s + r.weight, 0));
  const base = {
    rule_score: ruleScoreValue,
    counted_rules: counted.map((r) => r.rule_id),
    refuted_rules: [...refuted].filter((id) => rules.some((r) => r.rule_id === id)),
  };

  const hardRule = counted.some((r) => r.severity === "hard");
  const minimal = counted.some((r) => r.rule_id === "R09_MINIMAL");

  // --- Mode aturan saja (AI mati / anggaran habis / error): tidak pernah menghasilkan AMAN.
  if (!assessment) {
    if (hardRule) return { ...base, verdict: "PALSU", risk: Math.max(ruleScoreValue, GATE_THRESHOLDS.palsu), reason: "hard_signal", flag_for_review: false, degraded: true };
    return { ...base, verdict: "WASPADA", risk: Math.max(ruleScoreValue, GATE_THRESHOLDS.waspada), reason: "ai_unavailable", flag_for_review: false, degraded: true };
  }

  const llmRisk = Math.min(100, Math.max(0, Math.round(assessment.llm_risk_score)));
  const llmHard = assessment.red_flags.some((f) => f.severity === "hard" && f.evidence_quote.trim().length > 0);
  const risk = Math.round(GATE_WEIGHTS.rules * ruleScoreValue + GATE_WEIGHTS.llm * llmRisk);

  // 1. Sinyal keras (dari aturan yang tidak dibantah, atau dari AI dengan kutipan bukti) → PALSU.
  if (hardRule || llmHard) {
    return { ...base, verdict: "PALSU", risk: Math.max(risk, GATE_THRESHOLDS.palsu), reason: "hard_signal", flag_for_review: false, degraded: false };
  }
  // 2. Skor gabungan.
  if (risk >= GATE_THRESHOLDS.palsu) return { ...base, verdict: "PALSU", risk, reason: "combined_score", flag_for_review: false, degraded: false };
  if (risk >= GATE_THRESHOLDS.waspada) return { ...base, verdict: "WASPADA", risk, reason: "combined_score", flag_for_review: false, degraded: false };
  // 3. Info terlalu minim → tidak boleh AMAN.
  if (minimal) return { ...base, verdict: "WASPADA", risk, reason: "info_minim", flag_for_review: false, degraded: false };
  // 4. AI yakin PALSU tapi skor gabungan rendah → turunkan ke WASPADA + tinjau manual.
  if (assessment.llm_verdict === "PALSU") return { ...base, verdict: "WASPADA", risk, reason: "llm_palsu_low_score", flag_for_review: true, degraded: false };
  // 5. Injection terdeteksi → minimal WASPADA.
  if (injectionDetected) return { ...base, verdict: "WASPADA", risk: Math.max(risk, GATE_THRESHOLDS.waspada), reason: "combined_score", flag_for_review: true, degraded: false };

  return { ...base, verdict: "AMAN", risk, reason: "no_signal", flag_for_review: false, degraded: false };
}
