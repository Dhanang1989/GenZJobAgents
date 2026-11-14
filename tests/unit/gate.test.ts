import { describe, expect, it } from "vitest";
import type { ScamAssessment } from "@/lib/agents/schemas/agent1";
import { decideGate } from "@/lib/scam/gate";
import type { RuleHit } from "@/lib/scam/rules";

const hit = (rule_id: RuleHit["rule_id"], severity: RuleHit["severity"], weight: number): RuleHit => ({ rule_id, severity, weight, match: "…", label: rule_id });

function assessment(partial: Partial<ScamAssessment> = {}): ScamAssessment {
  return {
    llm_verdict: "AMAN",
    llm_risk_score: 10,
    confidence: "sedang",
    red_flags: [],
    green_flags: [],
    rule_signal_review: [],
    cannot_verify: [],
    user_safety_tips: [],
    ...partial,
  };
}

describe("decideGate", () => {
  it("aturan keras → PALSU walau AI bilang AMAN", () => {
    const d = decideGate([hit("R01_FEE", "hard", 40)], assessment({ llm_verdict: "AMAN", llm_risk_score: 5 }));
    expect(d.verdict).toBe("PALSU");
    expect(d.reason).toBe("hard_signal");
  });

  it("AI membantah aturan keras dengan alasan → dihitung ulang", () => {
    const d = decideGate(
      [hit("R01_FEE", "hard", 40)],
      assessment({ rule_signal_review: [{ rule_id: "R01_FEE", confirmed: false, reason: "teks berbunyi 'tanpa biaya'" }] }),
    );
    expect(d.verdict).toBe("AMAN");
    expect(d.refuted_rules).toContain("R01_FEE");
  });

  it("bantahan AI DITOLAK jika ada indikasi prompt injection", () => {
    const d = decideGate(
      [hit("R01_FEE", "hard", 40), hit("R10_INJECTION", "soft", 20)],
      assessment({ rule_signal_review: [{ rule_id: "R01_FEE", confirmed: false, reason: "aman" }] }),
    );
    expect(d.verdict).toBe("PALSU");
    expect(d.refuted_rules).toHaveLength(0);
  });

  it("laporan pengguna 'diminta bayar' tidak bisa dibantah AI", () => {
    const d = decideGate(
      [hit("R11_USER_PAY", "hard", 40)],
      assessment({ rule_signal_review: [{ rule_id: "R11_USER_PAY", confirmed: false, reason: "-" }] }),
    );
    expect(d.verdict).toBe("PALSU");
  });

  it("red flag keras dari AI dengan kutipan → PALSU", () => {
    const d = decideGate([], assessment({
      llm_verdict: "PALSU", llm_risk_score: 80,
      red_flags: [{ code: "minta_biaya", title: "Minta biaya", explanation: "-", evidence_quote: "bayar dulu 200rb", severity: "hard" }],
    }));
    expect(d.verdict).toBe("PALSU");
  });

  it("skor gabungan menentukan WASPADA", () => {
    const d = decideGate([hit("R05_CONTACT", "soft", 15), hit("R06_FREEMAIL", "soft", 15)], assessment({ llm_risk_score: 50 }));
    // 0.4*30 + 0.6*50 = 42
    expect(d.risk).toBe(42);
    expect(d.verdict).toBe("WASPADA");
  });

  it("skor gabungan tinggi tanpa sinyal keras → PALSU", () => {
    const d = decideGate([hit("R05_CONTACT", "soft", 15), hit("R07_URGENCY", "soft", 10)], assessment({ llm_risk_score: 100 }));
    expect(d.risk).toBe(70);
    expect(d.verdict).toBe("PALSU");
    expect(d.reason).toBe("combined_score");
  });

  it("info minim tidak boleh AMAN", () => {
    const d = decideGate([hit("R09_MINIMAL", "soft", 10)], assessment({ llm_risk_score: 0 }));
    expect(d.verdict).toBe("WASPADA");
    expect(d.reason).toBe("info_minim");
  });

  it("AI bilang PALSU tapi skor rendah → WASPADA + tinjau manual", () => {
    const d = decideGate([], assessment({ llm_verdict: "PALSU", llm_risk_score: 30 }));
    expect(d.verdict).toBe("WASPADA");
    expect(d.flag_for_review).toBe(true);
  });

  it("tanpa sinyal → AMAN", () => {
    const d = decideGate([], assessment());
    expect(d.verdict).toBe("AMAN");
  });

  describe("mode aturan saja (AI tidak tersedia)", () => {
    it("tidak pernah AMAN", () => {
      const d = decideGate([], null);
      expect(d.verdict).toBe("WASPADA");
      expect(d.degraded).toBe(true);
      expect(d.reason).toBe("ai_unavailable");
    });
    it("aturan keras tetap PALSU", () => {
      expect(decideGate([hit("R02_SECRET", "hard", 35)], null).verdict).toBe("PALSU");
    });
    it("aturan lunak menumpuk tetap WASPADA (bukan PALSU)", () => {
      const d = decideGate([hit("R05_CONTACT", "soft", 15), hit("R06_FREEMAIL", "soft", 15), hit("R07_URGENCY", "soft", 10), hit("R08_SHORTENER", "soft", 10), hit("R10_INJECTION", "soft", 20)], null);
      expect(d.verdict).toBe("WASPADA");
    });
  });
});
