# ZJobsAgent: Blueprint (v0.1, menunggu persetujuan)

**ZJobsAgent** adalah web app *mobile-first* dengan sistem multi-agent AI untuk fresh graduate dan Gen Z Indonesia. Tujuannya dua: **lebih sering dipanggil interview** dan **terhindar dari loker palsu**.

## Ringkasan 1 Halaman

**Masalah.** Pengangguran usia 15–24 tahun mencapai **17,37%** (BPS, Mei 2026). Ada **29.373 laporan** penipuan kerja ke IASC OJK (per Agustus 2026). Gen Z sudah memakai AI (**29,4%** vs rata-rata nasional **18,2%**, APJII 2026), tetapi tools umum tidak spesifik per lowongan dan cenderung mengarang isi CV.

**Solusi.** Estafet 3 agen dengan gerbang keamanan, ditampilkan transparan sebagai timeline:

```
Lead Orchestrator (kode) → Agen 1: Career Researcher & Job Scam Analyst
   → 🚧 Gerbang: PALSU = stop + lapor iasc.ojk.go.id · WASPADA = lanjut setelah konfirmasi · AMAN = lanjut
   → Agen 2: CV & Application Architect → 🛡️ Validator anti-fabrikasi (kode)
   → Agen 3: Recruiter Reviewer & Interview Coach (skor ATS sebelum/sesudah, revisi maks 1x)
   → Tracker + Laporan Markdown "Multi-Agent Orchestration Report"
```

**Pembeda.** (1) Cek loker palsu gratis tanpa login sebagai pintu masuk. (2) Aturan kejujuran ditegakkan **kode**, bukan sekadar prompt: setiap butir CV wajib merujuk fakta profil, dan yang kosong menjadi `[isi: …]`. (3) Keputusan gerbang scam diambil kode, sehingga tidak bisa "dibujuk" lewat prompt injection. (4) PII ditokenkan sebelum dikirim ke LLM.

**Stack.** Next.js + TypeScript + Tailwind/shadcn · Supabase (Auth, Postgres+RLS, Storage, Realtime) · Inngest (durable job) · Claude API (structured outputs) · Vercel (`sin1`) · Xendit/Midtrans · Upstash · Resend.

**Model bisnis.** Gratis (cek loker tanpa batas dengan *fair use*, 3 CV/bulan) · Premium Rp29–49 ribu/bulan [asumsi] · B2B kampus/SMK/BKK (Fase 3).
**North Star.** Jumlah panggilan interview per pengguna aktif per 30 hari (diukur dari Tracker).

**Roadmap.** MVP 6 minggu (solo dev): M1 cek loker palsu → M2 profil + CV tailor → M3 Agen 3 + laporan → M4 tracker lite + privasi → M5 pembayaran + landing → M6 beta + eval. Fase 2: tracker penuh, interview voice, WhatsApp. Fase 3: B2B dashboard.

⚠️ **Temuan penting:** estimasi biaya AI dengan semua agen di Claude Opus 5.5 adalah **≈ Rp5.600 per estafet** dan **≈ Rp700 per cek loker** [asumsi token & kurs]. Dengan konfigurasi ini, satu pengguna gratis bisa menelan biaya setara harga Premium. Lihat keputusan **K1**.

## Isi Folder

| File | Isi |
|---|---|
| [01-prd.md](01-prd.md) | Problem, 3 persona, value proposition, fitur MVP vs nanti, metrik, asumsi, risiko |
| [02-sitemap-userflow.md](02-sitemap-userflow.md) | Sitemap, user flow utama, alur PALSU, WASPADA, onboarding/consent, status tracker (Mermaid) |
| [03-wireframes.md](03-wireframes.md) | 17 wireframe ASCII mobile-first |
| [04-agent-architecture.md](04-agent-architecture.md) | Orkestrasi, system prompt, skema I/O JSON, logika gerbang, validator, skor ATS, retry, biaya token, template laporan, eval |
| [05-data-model.md](05-data-model.md) | ERD, 9 tabel inti + tabel pendukung, RLS, retensi |
| [06-tech-stack-api.md](06-tech-stack-api.md) | Stack + alasan, daftar endpoint, struktur folder, env |
| [07-security-compliance.md](07-security-compliance.md) | UU PDP & PP 33/2026, consent, DPIA ringkas, keamanan file, rate limit, prompt injection |
| [08-roadmap.md](08-roadmap.md) | MVP per minggu, Fase 2, Fase 3 (Gantt) |

## Jawaban Klarifikasi (sudah dikunci)

| # | Pertanyaan | Jawaban |
|---|---|---|
| Q1 | Tamu boleh cek loker tanpa login? | **Ya**, dengan rate limit + Turnstile. Login hanya untuk tailor CV |
| Q2 | Cara ambil isi link lowongan | **Fetch halaman publik + fallback tempel teks.** Tanpa login/bypass. Domain tetap dipakai sebagai sinyal |
| Q3 | Format unduhan CV | **PDF + DOCX**, template ATS satu kolom |
| Q4 | Tim pembangun | **Solo dev + AI coding**, roadmap 6 minggu berurutan |

## Asumsi Lain yang Saya Ambil

1. Kurs perencanaan **Rp16.500/USD**. Volume token per agen adalah estimasi (04 §9) dan diukur ulang di minggu 2.
2. Login memakai **OTP/magic link email + Google** (tanpa WA OTP di MVP, karena berbayar per pesan).
3. **Tracker Lite masuk MVP** (ubah status manual), karena North Star tidak bisa diukur tanpa itu. Pengingat, kanban, dan ringkasan mingguan tetap di Fase 2.
4. Premium di MVP berupa **pass bulanan bayar manual** (QRIS/e-wallet/VA), bukan auto-debit.
5. Ambang gerbang (PALSU ≥70, WASPADA 35–69), ambang revisi (ATS <70 atau Δ <10), dan batas rate limit adalah nilai awal yang dikalibrasi dengan eval.
6. Retensi: file CV asli 30 hari, output agen 180 hari, cek loker tamu 30 hari, purge akun ≤14 hari.
7. Mulai pengerjaan Senin, 9 November 2026.
8. Persona bersifat ilustratif dan divalidasi lewat wawancara di minggu 1–3.

## Keputusan yang Butuh Persetujuan Anda

| # | Keputusan | Rekomendasi saya | Opsi lain |
|---|---|---|---|
| **K1** | **Model AI per agen** (penentu unit economics) | Blueprint memakai **semua Claude Opus 5.5** sebagai default kualitas tertinggi. Sebelum launch, bandingkan dengan konfigurasi campuran memakai eval kualitas + biaya nyata (minggu 6), lalu Anda yang memutuskan | **B:** Agen 2 Opus 5.5, Agen 1 & 3 Sonnet 5.5, cek cepat & extractor Haiku 5.5 (≈Rp4.050/estafet, ≈Rp21/cek) · **C:** semua Sonnet 5.5 (≈Rp2.850/estafet) |
| K2 | Lead Orchestrator: kode deterministik atau LLM | **Kode** (murah, bisa diprediksi, gerbang tidak bisa dibujuk) | LLM planner (+biaya, +risiko) |
| K3 | Job runner untuk estafet | **Inngest** (durable step, retry per agen) | Trigger.dev · streaming langsung tanpa runner (lebih rapuh di HP) |
| K4 | Payment gateway + model tagihan | **Xendit**, Invoice/Payment Link, pass bulanan manual | Midtrans Snap · auto-recurring (fase berikutnya) |
| K5 | Metode login | **OTP/magic link email + Google** | + WA OTP (Fase 2) |
| K6 | Tracker Lite di MVP | **Ya** (dibutuhkan untuk North Star) | Tunda seluruh tracker ke Fase 2 |
| K7 | Harga & kuota Premium | Uji **Rp29rb vs Rp49rb** via fake-door di minggu 5. Kuota ditetapkan setelah K1 | Tetapkan sekarang |
| K8 | Alur WASPADA | **Lanjut setelah user centang "Saya paham risikonya"** | Selalu lanjut · selalu berhenti |
| K9 | Alur PALSU | **Berhenti total**, tanpa override, ada "Laporkan salah deteksi" (tinjauan manual) | Izinkan override dengan peringatan keras |
| K10 | Periode retensi data | Sesuai asumsi #6 | Lebih pendek/panjang |
| K11 | Region data | **Supabase Singapura** (cek Jakarta) + consent terpisah untuk pemrosesan AI di AS | Cari region Jakarta untuk DB |
| K12 | Batas usia | **Fitur CV hanya 18+**. Di bawah 18 hanya cek loker | Alur persetujuan orang tua/wali |
| K13 | Halaman hasil cek loker bisa dibagikan publik | **Ya**, tanpa kontak + disclaimer + form keberatan | Privat saja |
| K14 | Cache hasil cek loker lintas pengguna (hash konten, 7 hari) | **Ya** (hemat biaya, tanpa PII) | Tidak di-cache |
| K15 | Review hukum UU PDP & **PP 33/2026** | **Wajib sebelum soft launch.** Mulai kontak konsultan di minggu 3. Isi PP 33/2026 belum saya petakan pasal per pasal | — |
| K16 | Nama domain & brand | Konfirmasi "ZJobsAgent" + domain | — |

---

**Blueprint sudah sesuai? Ketik 'mulai MVP' untuk scaffold proyek sesuai roadmap minggu 1.**
