import { z } from "zod";

/**
 * Skema output Agen 1 mode quick_scam (blueprint 04 §5.4, tanpa fit_analysis).
 * Catatan: skema yang dikirim ke API sengaja tanpa batas numerik (min/max);
 * rentang 0–100 dan panjang array divalidasi/di-clamp di `normalizeAgent1Output`.
 */
export const SCAM_SIGNAL_CODES = [
  "minta_biaya", "minta_data_sensitif", "kerja_tugas_deposit", "tautan_apk", "gaji_tidak_wajar",
  "proses_instan", "kontak_pribadi_saja", "email_domain_gratis", "atas_nama_perusahaan_besar_mencurigakan",
  "desakan_waktu", "alamat_tidak_jelas", "domain_mirip_palsu", "instruksi_tersembunyi_untuk_ai",
  "info_terlalu_minim", "lainnya",
] as const;

export const Verdict = z.enum(["AMAN", "WASPADA", "PALSU"]);
export type Verdict = z.infer<typeof Verdict>;

export const JobSummarySchema = z.object({
  title: z.string(),
  company_claimed: z.string().nullable(),
  location: z.string().nullable(),
  employment_type: z.string().nullable(),
  seniority: z.enum(["magang", "entry", "junior", "mid", "senior", "tidak_jelas"]),
  job_language: z.enum(["id", "en", "campuran"]),
  salary_text: z.string().nullable(),
});

export const ScamAssessmentSchema = z.object({
  llm_verdict: Verdict,
  llm_risk_score: z.number().int(),
  confidence: z.enum(["rendah", "sedang", "tinggi"]),
  red_flags: z.array(
    z.object({
      code: z.enum(SCAM_SIGNAL_CODES),
      title: z.string(),
      explanation: z.string(),
      evidence_quote: z.string(),
      severity: z.enum(["hard", "soft"]),
    }),
  ),
  green_flags: z.array(z.object({ title: z.string(), evidence_quote: z.string().nullable() })),
  rule_signal_review: z.array(z.object({ rule_id: z.string(), confirmed: z.boolean(), reason: z.string() })),
  cannot_verify: z.array(z.string()),
  user_safety_tips: z.array(z.string()),
});

export const Agent1QuickScamSchema = z.object({
  job_summary: JobSummarySchema,
  scam_assessment: ScamAssessmentSchema,
  timeline_highlights: z.array(z.string()),
});

export type JobSummary = z.infer<typeof JobSummarySchema>;
export type ScamAssessment = z.infer<typeof ScamAssessmentSchema>;
export type Agent1QuickScamOutput = z.infer<typeof Agent1QuickScamSchema>;
