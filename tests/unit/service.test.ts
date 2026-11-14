import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent1QuickScamOutput } from "@/lib/agents/schemas/agent1";

// Agen 1 di-mock: tes ini memeriksa alur ingest → aturan → (cache | agen) → gerbang → simpan, tanpa memanggil API.
const runAgent1QuickScam = vi.fn();
vi.mock("@/lib/agents/agent1", () => ({ runAgent1QuickScam: (...args: unknown[]) => runAgent1QuickScam(...args) }));

const SCAM_TEXT =
  "PT Contoh Logistik Nusantara membuka lowongan admin gudang. Gaji 9 juta. Setelah lolos, peserta wajib transfer biaya pelatihan Rp350.000 ke rekening HRD. Hubungi WA 081234567890.";
const LEGIT_TEXT =
  "PT Sinar Contoh Abadi membuka lowongan Staff Admin di Bekasi. Kualifikasi: minimal SMK/D3, menguasai Microsoft Excel, teliti. Kirim CV ke rekrutmen@sinarcontoh.co.id paling lambat 30 November 2026. Proses seleksi tanpa dipungut biaya.";

function agentOk(verdict: "AMAN" | "WASPADA" | "PALSU", risk: number): { ok: true; output: Agent1QuickScamOutput; meta: object; promptVersion: string; droppedFlags: number } {
  return {
    ok: true,
    output: {
      job_summary: { title: "Staff Admin", company_claimed: "PT Contoh", location: null, employment_type: null, seniority: "entry", job_language: "id", salary_text: null },
      scam_assessment: { llm_verdict: verdict, llm_risk_score: risk, confidence: "sedang", red_flags: [], green_flags: [{ title: "Email domain perusahaan", evidence_quote: null }], rule_signal_review: [], cannot_verify: [], user_safety_tips: ["Cek situs resmi"] },
      timeline_highlights: ["ok"],
    },
    meta: { model: "claude-opus-5-5", cost_usd: 0.04, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 }, latency_ms: 1, attempts: 1, fallback_used: false },
    promptVersion: "agent1.v1",
    droppedFlags: 0,
  };
}

async function load() {
  vi.resetModules();
  const memory = await import("@/lib/store/memory");
  memory.resetMemoryStore();
  return import("@/lib/scam/service");
}

describe("scam service", () => {
  beforeEach(() => {
    runAgent1QuickScam.mockReset();
    vi.unstubAllEnvs();
  });

  it("tanpa API key → mode aturan saja; loker dengan biaya tetap PALSU", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { ingestJobPost, runScamCheck } = await load();
    const ingest = await ingestJobPost({ text: SCAM_TEXT, guestKeyHash: "g1" });
    expect(ingest.ok).toBe(true);
    if (!ingest.ok) return;
    const check = await runScamCheck(ingest.jobPost, { guestKeyHash: "g1" });
    expect(check.verdict).toBe("PALSU");
    expect(check.degraded).toBe(true);
    expect(check.degraded_reason).toBe("ai_not_configured");
    expect(runAgent1QuickScam).not.toHaveBeenCalled();
  });

  it("tanpa API key → loker wajar jadi WASPADA (bukan AMAN)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { ingestJobPost, runScamCheck } = await load();
    const ingest = await ingestJobPost({ text: LEGIT_TEXT, guestKeyHash: "g1" });
    if (!ingest.ok) throw new Error("ingest gagal");
    const check = await runScamCheck(ingest.jobPost, { guestKeyHash: "g1" });
    expect(check.verdict).toBe("WASPADA");
  });

  it("dengan AI → AMAN, dan cek kedua memakai cache (agen tidak dipanggil lagi)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    runAgent1QuickScam.mockResolvedValue(agentOk("AMAN", 8));
    const { ingestJobPost, runScamCheck } = await load();

    const a = await ingestJobPost({ text: LEGIT_TEXT, guestKeyHash: "g1" });
    const b = await ingestJobPost({ text: LEGIT_TEXT.toUpperCase(), guestKeyHash: "g2" });
    if (!a.ok || !b.ok) throw new Error("ingest gagal");
    const first = await runScamCheck(a.jobPost, { guestKeyHash: "g1" });
    const second = await runScamCheck(b.jobPost, { guestKeyHash: "g2" });

    expect(first.verdict).toBe("AMAN");
    expect(first.from_cache).toBe(false);
    expect(second.verdict).toBe("AMAN");
    expect(second.from_cache).toBe(true);
    expect(runAgent1QuickScam).toHaveBeenCalledTimes(1);
  });

  it("AI gagal (refusal) → jatuh ke mode aturan saja, tidak melempar error", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    runAgent1QuickScam.mockResolvedValue({ ok: false, reason: "refusal", message: "-" });
    const { ingestJobPost, runScamCheck } = await load();
    const ingest = await ingestJobPost({ text: LEGIT_TEXT, guestKeyHash: "g1" });
    if (!ingest.ok) throw new Error("ingest gagal");
    const check = await runScamCheck(ingest.jobPost, { guestKeyHash: "g1" });
    expect(check.degraded).toBe(true);
    expect(check.degraded_reason).toBe("ai_refusal");
    expect(check.verdict).toBe("WASPADA");
  });

  it("anggaran harian habis → AI tidak dipanggil", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("AI_DAILY_BUDGET_USD", "0");
    const { ingestJobPost, runScamCheck } = await load();
    const ingest = await ingestJobPost({ text: LEGIT_TEXT, guestKeyHash: "g1" });
    if (!ingest.ok) throw new Error("ingest gagal");
    const check = await runScamCheck(ingest.jobPost, { guestKeyHash: "g1" });
    expect(check.degraded_reason).toBe("ai_daily_budget_exceeded");
    expect(runAgent1QuickScam).not.toHaveBeenCalled();
  });

  it("validasi input: kosong, terlalu pendek, terlalu panjang, URL privat", async () => {
    const { ingestJobPost } = await load();
    expect(await ingestJobPost({ text: "", guestKeyHash: null })).toMatchObject({ ok: false, code: "empty" });
    expect(await ingestJobPost({ text: "loker gaji gede", guestKeyHash: null })).toMatchObject({ ok: false, code: "too_short" });
    expect(await ingestJobPost({ text: "a".repeat(8_001), guestKeyHash: null })).toMatchObject({ ok: false, code: "too_long" });
    expect(await ingestJobPost({ url: "http://127.0.0.1/admin", guestKeyHash: null })).toMatchObject({ ok: false, code: "invalid_url" });
  });

  it("URL + teks tempel → teks dipakai, domain tetap dicatat sebagai sinyal", async () => {
    const { ingestJobPost } = await load();
    const r = await ingestJobPost({ url: "https://bit.ly/loker123", text: SCAM_TEXT, guestKeyHash: null });
    if (!r.ok) throw new Error("ingest gagal");
    expect(r.fetch).toBeNull();
    expect(r.jobPost.domain).toBe("bit.ly");
    expect(r.jobPost.source).toBe("text");
  });
});
