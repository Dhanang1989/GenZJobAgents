import { maskContacts } from "@/lib/ingest/sanitize";
import type { Verdict } from "@/lib/agents/schemas/agent1";
import type { RuleHit, RuleId } from "@/lib/scam/rules";
import type { JobPostRecord, ScamCheckRecord } from "@/lib/store/types";

export const IASC_OJK_URL = "https://iasc.ojk.go.id";

export type PublicFlag = { title: string; explanation: string; evidence: string | null; severity: "hard" | "soft"; source: "ai" | "aturan" };

export type PublicScamCheck = {
  share_token: string;
  created_at: string;
  verdict: Verdict;
  risk_score: number;
  job: { title: string; company_claimed: string | null; location: string | null; domain: string | null };
  red_flags: PublicFlag[];
  green_flags: { title: string; evidence: string | null }[];
  cannot_verify: string[];
  safety_tips: string[];
  degraded: boolean;
  from_cache: boolean;
  flag_for_review: boolean;
  truncated: boolean;
};

const RULE_TO_CODE: Partial<Record<RuleId, string>> = {
  R01_FEE: "minta_biaya", R11_USER_PAY: "minta_biaya", R02_SECRET: "minta_data_sensitif", R02B_ID_DOCS: "minta_data_sensitif",
  R03_APK: "tautan_apk", R03B_INSTALL_APP: "tautan_apk", R04_TASK: "kerja_tugas_deposit", R05_CONTACT: "kontak_pribadi_saja",
  R06_FREEMAIL: "email_domain_gratis", R07_URGENCY: "desakan_waktu", R09_MINIMAL: "info_terlalu_minim", R10_INJECTION: "instruksi_tersembunyi_untuk_ai",
};

const RULE_EXPLANATION: Record<RuleId, string> = {
  R01_FEE: "Perusahaan resmi tidak memungut biaya apa pun dari pelamar: pendaftaran, pelatihan, seragam, maupun tes kesehatan.",
  R02_SECRET: "Kode OTP, PIN, password, atau selfie dengan KTP bisa dipakai membobol rekening atau mengajukan pinjaman atas namamu.",
  R02B_ID_DOCS: "Kirim KTP/KK/rekening hanya ke kanal resmi perusahaan dan hanya setelah tahap seleksi yang jelas.",
  R03_APK: "File .apk dari luar Play Store bisa berisi aplikasi penyadap untuk mencuri data dan kode OTP.",
  R03B_INSTALL_APP: "Pastikan aplikasi yang diminta adalah aplikasi resmi dari toko aplikasi, bukan file kiriman.",
  R04_TASK: "Pola 'kerja tugas' (like/subscribe dibayar) biasanya berujung permintaan deposit atau top up saldo.",
  R05_CONTACT: "Perekrut resmi umumnya punya email domain perusahaan atau situs karier, tidak hanya nomor WhatsApp/Telegram.",
  R06_FREEMAIL: "Perusahaan besar biasanya memakai email domain sendiri. Email gratis yang mengatasnamakan PT/BUMN patut dicurigai.",
  R07_URGENCY: "Desakan waktu atau janji 'pasti diterima tanpa tes' adalah taktik agar kamu tidak sempat berpikir.",
  R08_SHORTENER: "Tautan pendek menyembunyikan alamat aslinya. Periksa ke mana tautan itu mengarah sebelum membuka.",
  R09_MINIMAL: "Informasinya terlalu sedikit untuk dinilai. Cari lowongan ini di situs karier resmi perusahaan.",
  R10_INJECTION: "Teks lowongan berisi perintah yang ditujukan ke AI. Lowongan asli tidak melakukan ini.",
  R11_USER_PAY: "Kamu melaporkan diminta membayar. Perusahaan resmi tidak meminta uang dari pelamar.",
};

export const DEFAULT_SAFETY_TIPS = [
  "Jangan transfer uang dengan alasan apa pun (pendaftaran, pelatihan, seragam, tiket).",
  "Jangan kirim kode OTP, PIN, password, atau selfie dengan KTP.",
  "Cek lowongan di situs karier atau akun resmi perusahaan.",
];

export const VERIFY_CHECKLIST = [
  "Lowongan ini ada di situs karier/akun resmi perusahaan?",
  "HR memakai email dengan domain perusahaan?",
  "Tidak ada permintaan bayar atau data rahasia?",
  "Alamat kantor jelas dan bisa dicek di peta?",
];

function ruleFlag(hit: RuleHit): PublicFlag {
  const evidence = hit.match.startsWith("dilaporkan pengguna") || hit.match.startsWith("teks hanya") || hit.match.startsWith("tidak ada") ? null : maskContacts(hit.match);
  return { title: hit.label, explanation: RULE_EXPLANATION[hit.rule_id], evidence, severity: hit.severity, source: "aturan" };
}

function fallbackTitle(text?: string): string {
  const firstLine = text?.split("\n").find((l) => l.trim().length > 0)?.trim() ?? "";
  if (!firstLine) return "Lowongan";
  return maskContacts(firstLine.length > 70 ? `${firstLine.slice(0, 67).trimEnd()}…` : firstLine);
}

export function toPublicView(check: ScamCheckRecord, post: JobPostRecord | null): PublicScamCheck {
  const a = check.llm_assessment;
  const counted = new Set(check.gate.counted_rules);
  const countedHits = check.rule_hits.filter((h) => counted.has(h.rule_id));

  const aiFlags: PublicFlag[] = (a?.red_flags ?? []).map((f) => ({
    title: f.title,
    explanation: f.explanation,
    evidence: maskContacts(f.evidence_quote),
    severity: f.severity,
    source: "ai",
  }));
  const aiCodes = new Set<string>((a?.red_flags ?? []).map((f) => f.code));
  // Tambahkan sinyal aturan yang belum terwakili oleh temuan AI (atau semua, jika mode aturan saja).
  const ruleFlags = countedHits.filter((h) => !aiCodes.has(RULE_TO_CODE[h.rule_id] ?? "-")).map(ruleFlag);
  const redFlags = [...aiFlags, ...ruleFlags].sort((x, y) => (x.severity === y.severity ? 0 : x.severity === "hard" ? -1 : 1));

  const summary = check.job_summary;
  return {
    share_token: check.share_token,
    created_at: check.created_at,
    verdict: check.verdict,
    risk_score: check.risk_score,
    job: {
      title: summary?.title ?? post?.title ?? fallbackTitle(post?.sanitized_text),
      company_claimed: summary?.company_claimed ?? null,
      location: summary?.location ?? null,
      domain: post?.domain ?? null,
    },
    red_flags: redFlags,
    green_flags: (a?.green_flags ?? []).map((gf) => ({ title: gf.title, evidence: gf.evidence_quote ? maskContacts(gf.evidence_quote) : null })),
    cannot_verify: a?.cannot_verify ?? [],
    safety_tips: a?.user_safety_tips?.length ? a.user_safety_tips.map(maskContacts) : DEFAULT_SAFETY_TIPS,
    degraded: check.degraded,
    from_cache: check.from_cache,
    flag_for_review: check.gate.flag_for_review,
    truncated: Boolean(post?.truncated),
  };
}

/** Teks ringkasan bukti untuk dilampirkan saat melapor ke IASC OJK. */
export function evidenceSummary(view: PublicScamCheck): string {
  const lines = [
    `Ringkasan cek loker (ZJobsAgent) — ${new Date(view.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
    `Posisi: ${view.job.title}`,
    `Perusahaan yang diklaim: ${view.job.company_claimed ?? "-"}`,
    view.job.domain ? `Sumber/tautan: ${view.job.domain}` : null,
    `Hasil: ${view.verdict} (skor risiko ${view.risk_score}/100)`,
    "Tanda penipuan:",
    ...view.red_flags.map((f, i) => `${i + 1}. ${f.title}${f.evidence ? ` — "${f.evidence}"` : ""}`),
    "Catatan: hasil ini indikasi berbasis AI, bukan putusan hukum. Lampirkan juga tangkapan layar chat/lowongan asli.",
  ];
  return lines.filter(Boolean).join("\n");
}
