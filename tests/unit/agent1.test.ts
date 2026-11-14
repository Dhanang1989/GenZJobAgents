import { describe, expect, it } from "vitest";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { normalizeAgent1Output, quoteAppearsIn } from "@/lib/agents/agent1-normalize";
import { Agent1QuickScamSchema, type Agent1QuickScamOutput } from "@/lib/agents/schemas/agent1";

const SOURCE = "Lowongan Staff Admin PT Contoh. Peserta wajib transfer biaya pelatihan Rp350.000 ke rekening pribadi.";

function output(partial: Partial<Agent1QuickScamOutput["scam_assessment"]> = {}): Agent1QuickScamOutput {
  return {
    job_summary: { title: "Staff Admin", company_claimed: "PT Contoh", location: null, employment_type: null, seniority: "entry", job_language: "id", salary_text: null },
    scam_assessment: {
      llm_verdict: "PALSU", llm_risk_score: 140, confidence: "tinggi",
      red_flags: [
        { code: "minta_biaya", title: "Minta biaya", explanation: "-", evidence_quote: "transfer biaya pelatihan Rp350.000", severity: "hard" },
        { code: "desakan_waktu", title: "Desakan", explanation: "-", evidence_quote: "hari ini terakhir!", severity: "soft" },
      ],
      green_flags: [], rule_signal_review: [], cannot_verify: [], user_safety_tips: ["a", "b", "c", "d", "e"],
      ...partial,
    },
    timeline_highlights: ["x"],
  };
}

describe("Agen 1 pasca-proses", () => {
  it("membuang red flag yang kutipannya tidak ada di teks (anti-halusinasi bukti)", () => {
    const { output: out, droppedFlags } = normalizeAgent1Output(output(), SOURCE);
    expect(droppedFlags).toBe(1);
    expect(out.scam_assessment.red_flags.map((f) => f.code)).toEqual(["minta_biaya"]);
  });

  it("clamp skor 0–100 dan batasi jumlah tips", () => {
    const { output: out } = normalizeAgent1Output(output(), SOURCE);
    expect(out.scam_assessment.llm_risk_score).toBe(100);
    expect(out.scam_assessment.user_safety_tips).toHaveLength(4);
  });

  it("kutipan dicocokkan tanpa peduli huruf besar/spasi/tanda kutip", () => {
    expect(quoteAppearsIn("“Transfer   BIAYA pelatihan”", SOURCE)).toBe(true);
    expect(quoteAppearsIn("ab", SOURCE)).toBe(false);
  });

  it("skema Zod bisa dikonversi ke format structured outputs", () => {
    const format = betaZodOutputFormat(Agent1QuickScamSchema);
    expect(format.type).toBe("json_schema");
    const parsed = format.parse(JSON.stringify(output()));
    expect(parsed.job_summary.title).toBe("Staff Admin");
  });
});
