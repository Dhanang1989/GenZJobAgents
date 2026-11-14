# ZJobsAgent

Web app multi-agent AI untuk fresh graduate & Gen Z Indonesia: **cek loker palsu** dan (segera) **CV per lowongan**.
Blueprint lengkap ada di [`blueprint/`](blueprint/README.md).

## Status: Minggu 1 (Fondasi + Cek Loker Palsu)

| Fitur | Status |
|---|---|
| Cek loker tamu (tempel teks / link) → AMAN / WASPADA / PALSU + bukti kutipan | ✅ |
| Rule engine deterministik (R01–R11) + gerbang scam di kode | ✅ |
| Agen 1 mode `quick_scam` (Claude, structured outputs, fallback refusal, cache 7 hari) | ✅ (belum diuji ke API sungguhan) |
| Mode aturan saja jika AI mati/anggaran habis (tidak pernah memberi AMAN) | ✅ |
| Fetch link aman: anti-SSRF, IP dipaku (anti DNS rebinding), robots.txt, batas 2 MB/8 dtk, buang teks tersembunyi | ✅ |
| Layar Gerbang PALSU: lapor IASC OJK, salin ringkasan bukti, bagikan, laporkan salah deteksi | ✅ |
| Rate limit tamu (perangkat + IP), Turnstile, anggaran AI harian | ✅ |
| Migrasi Supabase + RLS + fungsi retensi | ✅ (divalidasi di Postgres 16 lokal) |
| Eval set `scam` v0 (18 sampel sintetis) | ✅ (mode aturan saja) |

## Menjalankan

```bash
npm install
cp .env.example .env.local   # semua opsional untuk dev
npm run dev                  # http://localhost:3000/cek-loker
```

```bash
npm test                     # 101 unit test
npm run typecheck
npm run lint
npm run eval:scam            # eval mode aturan saja (gratis)
EVAL_USE_LLM=1 npm run eval:scam   # eval memakai Agen 1 sungguhan (BERBIAYA, butuh ANTHROPIC_API_KEY)
```

## Struktur penting

```
app/cek-loker/                 form & halaman hasil (share link, noindex)
app/api/job-posts              Langkah 0: fetch/sanitasi/simpan lowongan
app/api/scam-checks            aturan → (cache | Agen 1) → gerbang → simpan
app/api/public/scam-checks/…   hasil publik (kontak dimasking) + feedback salah deteksi
lib/scam/rules.ts              rule engine (naikkan RULES_VERSION tiap ubah pola)
lib/scam/gate.ts               keputusan gerbang (kode, bukan LLM)
lib/agents/                    klien Claude, prompt v1, skema Zod, pasca-proses anti-halusinasi bukti
lib/ingest/                    fetch aman, robots.txt, sanitasi & masking
lib/store/                     Supabase (produksi) | memori (dev/tes)
supabase/migrations/           skema + RLS
evals/                         dataset & runner eval
```

## Penyesuaian terhadap blueprint (sudah dicatat di blueprint/04)
- **R02 dipecah:** OTP/PIN/selfie-KTP = sinyal keras; permintaan fotokopi KTP/KK = sinyal **lunak**, karena banyak loker pabrik/UMKM resmi memintanya sebagai berkas.
- **R09 (info minim):** ambang 150 karakter (bukan 200).
- **R03B (instal aplikasi tanpa .apk):** sinyal lunak baru.
- Feedback salah deteksi lewat `POST /api/public/scam-checks/:shareToken/feedback` (tamu belum punya akun).
