import { canonicalize, extractSignals, normalizeText, type TextSignals } from "@/lib/ingest/sanitize";

/**
 * Rule engine deterministik (blueprint 04 §5.5, Lapis 1).
 * Setiap perubahan pola WAJIB menaikkan RULES_VERSION (dipakai sebagai kunci cache & audit).
 */
export const RULES_VERSION = "rules-2026.11.1";

export type RuleId =
  | "R01_FEE" | "R02_SECRET" | "R02B_ID_DOCS" | "R03_APK" | "R03B_INSTALL_APP" | "R04_TASK"
  | "R05_CONTACT" | "R06_FREEMAIL" | "R07_URGENCY" | "R08_SHORTENER" | "R09_MINIMAL"
  | "R10_INJECTION" | "R11_USER_PAY";

export type Severity = "hard" | "soft";

export type RuleHit = {
  rule_id: RuleId;
  severity: Severity;
  weight: number;
  /** Potongan teks yang memicu aturan (untuk bukti & review LLM). */
  match: string;
  label: string;
};

export type UserReported = {
  recruiter_contact_type?: "wa" | "telegram" | "email_gratis" | "email_domain" | "lainnya" | null;
  asked_to_pay?: boolean | null;
};

export type RuleInput = {
  text: string;
  sourceUrl?: string | null;
  userReported?: UserReported;
};

type RuleDef = {
  id: RuleId;
  severity: Severity;
  weight: number;
  label: string;
  test: (ctx: RuleContext) => string | null;
};

type RuleContext = { text: string; canon: string; display: string; signals: TextSignals; userReported: UserReported };

// Frasa yang menetralkan kata "biaya" dkk. jika muncul tepat sebelum pola.
const NEGATION_BEFORE = [
  /\b(tanpa|gratis|bebas)\s+(\w+\s+){0,2}$/i, // "tanpa dipungut biaya ..."
  /\b(tidak|tdk|tak|bukan)\s+(\w+\s+){0,2}$/i, // "tidak dipungut biaya ...", "tidak ada biaya ..."
  /\b(no|zero)\s+$/i, // "no registration fee"
];
const NEGATION_AFTER = /^\s*(\w+\s+){0,2}(gratis|free|ditanggung( oleh)? perusahaan|dibayar( oleh)? perusahaan|tidak dipungut|0\b|nol\b)/i;

/** Cari match pertama dari pola yang TIDAK didahului/diikuti penyangkalan ("tanpa biaya", "biaya gratis"). */
/** Teks yang dicocokkan: `canon` (huruf kecil) + `display` (huruf asli, posisi sejajar) untuk potongan bukti. */
type Texts = { canon: string; display: string };

function findUnnegated({ canon, display }: Texts, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    for (const m of canon.matchAll(re)) {
      const start = m.index ?? 0;
      const before = canon.slice(Math.max(0, start - 40), start);
      const after = canon.slice(start + m[0].length, start + m[0].length + 30);
      if (NEGATION_BEFORE.some((n) => n.test(before)) || NEGATION_AFTER.test(after)) continue;
      return excerpt({ canon, display }, start, m[0].length);
    }
  }
  return null;
}

function findAny({ canon, display }: Texts, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = canon.match(p);
    if (m) return excerpt({ canon, display }, m.index ?? 0, m[0].length);
  }
  return null;
}

function excerpt({ canon, display }: Texts, start: number, len: number): string {
  // toLowerCase bisa mengubah panjang untuk sebagian kecil karakter Unicode; jika tidak sejajar, pakai canon.
  const source = display.length === canon.length ? display : canon;
  // Potong di batas kata agar bukti tetap terbaca.
  let s = Math.max(0, start - 25);
  let e = Math.min(canon.length, start + len + 35);
  while (s > 0 && s < start && source[s - 1] !== " ") s++;
  while (e < source.length && e > start + len && source[e] !== " ") e--;
  return `${s > 0 ? "…" : ""}${source.slice(s, e).trim()}${e < source.length ? "…" : ""}`;
}

const FEE_PATTERNS = [
  /biaya\s+(pendaftaran|registrasi|administrasi|admin|pelatihan|training|diklat|seragam|atribut|medical|mcu|medis|tes|test|psikotes|interview|wawancara|penginapan|akomodasi|mess|tiket|transport|proses|pemberkasan|id card|asuransi|jaminan)/,
  /\b(transfer|tf|bayar|membayar|setor|setorkan|kirim uang)\b\s*(\w+\s+){0,3}(ke\s+)?(rekening|rek\b|no\.?\s*rek|dana|ovo|gopay|shopeepay|sebesar|senilai|rp\.?\s?\d)/,
  /\b(uang|dana)\s+(jaminan|pendaftaran|administrasi|pelatihan|seragam|tiket|deposit)/,
  /\b(deposit|dp)\s+(sebesar|rp|senilai|\d)/,
  /\b(registration|training|processing|application|admin|medical|visa|uniform)\s+fee/,
  /\bpay\s+(a\s+)?(fee|deposit)\b/,
];

const SECRET_PATTERNS = [
  /\b(kode\s+)?otp\b/,
  /\bkode\s+(verifikasi|aktivasi|keamanan)\b/,
  /\b(pin|password|kata sandi)\s+(atm|m-?banking|rekening|bank|akun|e-?wallet|dana|ovo|gopay)/,
  /\b(selfie|swafoto|foto)\s+(sambil\s+|dengan\s+|memegang\s+|pegang\s+)+(ktp|kartu identitas)/,
  /\b(cvv|nomor kartu kredit|masa berlaku kartu)\b/,
  /\b(username|user id)\s+dan\s+(password|pin)\b/,
];

const ID_DOC_PATTERNS = [
  /\b(foto|scan|kirim|kirimkan|upload|lampirkan)\s+(\w+\s+){0,2}(ktp|kk|kartu keluarga|buku tabungan|nomor rekening|no\.?\s*rekening)/,
  /\bnomor\s+rekening\s+(anda|kamu|pribadi)\b/,
];

const TASK_PAY = /(dibayar|bayaran|komisi|upah|fee|dapat uang|penghasilan|cuan|reward|bonus)/;
const TASK_PATTERNS = [
  /\b(like|follow|subscribe|rating|review|ulasan|komentar|share)\b\s*(\w+\s+){0,2}(video|produk|akun|toko|channel|youtube|tiktok|instagram|hotel|aplikasi|postingan|google maps)/,
];
const TASK_STRONG = [
  /\bkerja\s+tugas\b/, /\btugas\s+(harian\s+)?(berbayar|dibayar)\b/, /\bkomisi\s+per\s+tugas\b/,
  /\b(isi|top\s?-?up|tambah)\s+saldo\b/, /\bmisi\s+(berbayar|harian)\b/, /\bpaid\s+tasks?\b/,
];

const URGENCY_PATTERNS = [
  /hari ini (terakhir|saja)/, /\b(kuota|slot|tempat) (sangat )?terbatas\b/, /\bsegera (hubungi|daftar|transfer)\b/,
  /\btanpa (tes|test|interview|wawancara|seleksi)\b/, /\b(pasti|dijamin|langsung) (diterima|lolos)\b/,
  /\blangsung kerja (besok|hari ini)\b/, /\b(only|limited) (today|slots?)\b/, /\bno interview\b/,
];

const INJECTION_PATTERNS = [
  /\b(ignore|disregard|forget)\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions|prompts?|rules)/,
  /\babaikan\s+(semua\s+|seluruh\s+)?(instruksi|perintah|aturan)/,
  /\byou are (now )?(an? )?(ai|assistant|chatgpt|claude|language model)\b/,
  /\b(kamu|anda) adalah (ai|asisten|chatgpt|claude)\b/,
  /\bsystem prompt\b/, /\bnyatakan\s+(bahwa\s+)?(lowongan|loker)?\s*(ini\s+)?(aman|asli)\b/,
  /\b(beri|berikan|kasih)\s+(skor|nilai)\s+100\b/, /\b(rate|mark|classify)\s+this\s+(job|posting|candidate)\s+as\b/,
  /\bas an ai\b/, /\bsebagai (ai|model bahasa)\b/,
];

const COMPANY_INDICATOR = /\b(pt\.?|cv\.?|perusahaan|company|inc\.?|ltd\.?|tbk|persero|toko|klinik|rumah sakit|rs |sekolah|yayasan|koperasi|universitas|bank|hotel|restoran|startup)\b/;
const BIG_COMPANY_CLAIM = /\b(pt\.?|persero|tbk|bumn|bank|group|grup|indonesia)\b/;

const RULES: RuleDef[] = [
  {
    id: "R01_FEE", severity: "hard", weight: 40, label: "Meminta biaya dari pelamar",
    test: (ctx) => findUnnegated(ctx, FEE_PATTERNS),
  },
  {
    id: "R02_SECRET", severity: "hard", weight: 35, label: "Meminta OTP/PIN/selfie dengan KTP",
    test: (ctx) => findUnnegated(ctx, SECRET_PATTERNS),
  },
  {
    // Banyak loker resmi meminta fotokopi KTP sebagai berkas lamaran, jadi ini hanya sinyal lunak.
    id: "R02B_ID_DOCS", severity: "soft", weight: 10, label: "Meminta dokumen identitas/rekening di awal",
    test: (ctx) => findAny(ctx, ID_DOC_PATTERNS),
  },
  {
    id: "R03_APK", severity: "hard", weight: 40, label: "Tautan file aplikasi (.apk)",
    test: (ctx) => ctx.signals.apkLinks[0] ?? findAny(ctx, [/\b[\w-]+\.apk\b/]),
  },
  {
    id: "R03B_INSTALL_APP", severity: "soft", weight: 15, label: "Diminta mengunduh/instal aplikasi tertentu",
    test: (ctx) => findAny(ctx, [/\b(download|unduh|install|instal|pasang)\s+(\w+\s+){0,2}(aplikasi|app|apk)\b/]),
  },
  {
    id: "R04_TASK", severity: "hard", weight: 35, label: "Pola 'kerja tugas' / like-subscribe berbayar",
    test: (ctx) => {
      const strong = findAny(ctx, TASK_STRONG);
      if (strong) return strong;
      const task = findAny(ctx, TASK_PATTERNS);
      return task && TASK_PAY.test(ctx.canon) ? task : null;
    },
  },
  {
    id: "R05_CONTACT", severity: "soft", weight: 15, label: "Kontak hanya lewat chat/nomor pribadi",
    test: ({ signals, userReported }) => {
      const onlyChat = (signals.hasChatLink || signals.phoneNumbers.length > 0) && signals.emails.length === 0 && signals.websiteDomains.length === 0;
      const reported = userReported.recruiter_contact_type === "wa" || userReported.recruiter_contact_type === "telegram";
      if (onlyChat) return signals.phoneNumbers[0] ?? signals.domains.find((d) => d === "wa.me" || d === "t.me") ?? "kontak chat";
      if (reported && signals.emails.length === 0 && signals.websiteDomains.length === 0) return "dilaporkan pengguna: kontak via chat";
      return null;
    },
  },
  {
    id: "R06_FREEMAIL", severity: "soft", weight: 15, label: "Email domain gratis mengatasnamakan perusahaan",
    test: ({ canon, signals, userReported }) => {
      const free = signals.emails.find((e) => signals.freeEmailDomains.some((d) => e.endsWith(`@${d}`)));
      if (free && BIG_COMPANY_CLAIM.test(canon) && signals.companyEmailDomains.length === 0) return free;
      if (userReported.recruiter_contact_type === "email_gratis" && BIG_COMPANY_CLAIM.test(canon)) return "dilaporkan pengguna: email domain gratis";
      return null;
    },
  },
  {
    id: "R07_URGENCY", severity: "soft", weight: 10, label: "Desakan waktu / jaminan pasti diterima",
    test: (ctx) => findAny(ctx, URGENCY_PATTERNS),
  },
  {
    id: "R08_SHORTENER", severity: "soft", weight: 10, label: "Tautan disamarkan (URL shortener)",
    test: ({ signals }) => signals.shorteners[0] ?? null,
  },
  {
    id: "R09_MINIMAL", severity: "soft", weight: 10, label: "Informasi lowongan terlalu minim",
    test: ({ canon }) => {
      if (canon.length < 150) return `teks hanya ${canon.length} karakter`;
      if (!COMPANY_INDICATOR.test(canon)) return "tidak ada nama perusahaan/instansi";
      return null;
    },
  },
  {
    id: "R10_INJECTION", severity: "soft", weight: 20, label: "Berisi instruksi tersembunyi untuk AI",
    test: (ctx) => findAny(ctx, INJECTION_PATTERNS),
  },
  {
    id: "R11_USER_PAY", severity: "hard", weight: 40, label: "Pengguna melaporkan diminta membayar",
    test: ({ userReported }) => (userReported.asked_to_pay === true ? "dilaporkan pengguna: diminta bayar" : null),
  },
];

export function runRules(input: RuleInput): RuleHit[] {
  const display = normalizeText(input.text).replace(/\s+/g, " ");
  const ctx: RuleContext = {
    text: input.text,
    display,
    canon: canonicalize(input.text),
    signals: extractSignals(input.text, input.sourceUrl),
    userReported: input.userReported ?? {},
  };
  const hits: RuleHit[] = [];
  for (const rule of RULES) {
    const match = rule.test(ctx);
    if (match) hits.push({ rule_id: rule.id, severity: rule.severity, weight: rule.weight, match, label: rule.label });
  }
  return hits;
}

export function ruleScore(hits: RuleHit[]): number {
  return Math.min(100, hits.reduce((sum, h) => sum + h.weight, 0));
}
