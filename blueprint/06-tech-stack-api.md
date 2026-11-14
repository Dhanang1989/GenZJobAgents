# 06 — Tech Stack, API & Struktur Proyek

## 1. Rekomendasi Stack

| Lapisan | Pilihan | Alasan | Alternatif |
|---|---|---|---|
| Framework | **Next.js (App Router, versi stabil terbaru) + TypeScript** | Satu codebase untuk UI + API (Route Handlers/Server Actions), SSR untuk SEO landing & halaman edukasi, ekosistem besar, sangat cocok untuk solo dev | Remix, SvelteKit |
| Styling/UI | **Tailwind CSS + shadcn/ui** (Radix) | Cepat, komponen aksesibel, bundle kecil (penting untuk HP entry-level) | — |
| Validasi | **Zod** | Satu skema untuk validasi form, API, *dan* structured outputs Claude (`zodOutputFormat`) | Valibot |
| Auth | **Supabase Auth**: OTP/magic link email + Google OAuth | Gratis di tier awal, terintegrasi dengan RLS | WA OTP (Fase 2, berbayar per pesan) |
| Database | **Supabase Postgres** + RLS | Relasional (cocok untuk tracker & kuota), RLS untuk isolasi data per pengguna | Neon + Drizzle |
| ORM/Query | **Drizzle ORM** (migrasi SQL) + `supabase-js` untuk Auth/Storage/Realtime | Tipe aman, SQL transparan | Prisma |
| Storage | **Supabase Storage** (bucket privat + signed URL) | Satu vendor, policy berbasis user | S3/R2 |
| Realtime | **Supabase Realtime** (subscribe `run_events`) | Timeline estafet tanpa koneksi SSE panjang di serverless. Tahan terhadap koneksi HP yang putus | SSE |
| Job runner | **Inngest** (durable steps, retry, concurrency per user) | Estafet bisa 1–3 menit [ASUMSI] dengan banyak langkah. Durable step = retry per agen tanpa mengulang semuanya, dan pengguna boleh menutup halaman | Trigger.dev, Supabase Queues + Edge Functions *(keputusan K3)* |
| AI | **Claude API** via `@anthropic-ai/sdk`, structured outputs, prompt caching | Lihat 04 §8 | — |
| Parsing CV | `unpdf` (PDF) · `mammoth` (DOCX) | Murni JS, jalan di serverless | — |
| Render CV | **DOCX:** `docx` (npm) · **PDF:** `@react-pdf/renderer` | Tanpa headless Chromium, jadi ringan di serverless. Satu sumber data (`tailored_json`) → dua format | Gotenberg (Chromium) |
| Fetch lowongan | Fetcher internal (`undici`) + `@mozilla/readability` + `linkedom` | Kontrol penuh atas anti-SSRF, robots, dan batas ukuran | Claude web fetch tool (tidak dipilih: kontrol sanitasi lebih lemah) |
| Rate limit | **Upstash Redis** + `@upstash/ratelimit` | Serverless-friendly, sliding window | Postgres counter |
| Anti-bot tamu | **Cloudflare Turnstile** | Captcha tak terlihat, gratis | hCaptcha |
| Pembayaran | **Xendit** *(rekomendasi)* atau **Midtrans** | Keduanya mendukung QRIS, e-wallet, VA. MVP memakai **Invoice/Payment Link + webhook** (pass bulanan) agar sederhana *(keputusan K4)* | — |
| Email | **Resend** (+ React Email) | OTP fallback, pengingat follow-up (Fase 2) | Postmark |
| Hosting | **Vercel** (region fungsi `sin1` Singapura) | Integrasi Next.js terbaik, preview deploy. Fungsi berat dipindah ke Inngest | Netlify, Fly.io |
| Region DB | **Supabase region terdekat (Singapura)**. Cek ketersediaan region Jakarta | Latensi + pertimbangan data lokal UU PDP *(keputusan K11)* | — |
| Error monitoring | **Sentry** (PII scrubbing aktif, tanpa payload prompt) | | |
| Product analytics | **PostHog** (event tanpa PII, IP anonim) | Funnel aktivasi & North Star | Plausible (hanya web analytics) |
| Testing | Vitest (unit: rule engine, validator, gate) · Playwright (E2E mobile viewport) · eval script (04 §11) | | |
| CI | GitHub Actions: lint, typecheck, test, eval (pada perubahan prompt) | | |

### Kenapa bukan alternatif lain (ringkas)
- **Tanpa job runner** (langsung streaming dari Route Handler): lebih sederhana, tetapi estafet putus jika koneksi HP drop atau fungsi kena batas durasi, dan retry per langkah sulit. Inngest memberi durable steps dengan biaya kompleksitas kecil.
- **LLM sebagai orchestrator**: tidak perlu, karena alurnya tetap (04 §1 D1–D2).

---

## 2. Daftar Endpoint API

> Semua endpoint di bawah `/api`. 🔒 = butuh sesi Supabase. 🌐 = publik dengan rate limit + Turnstile. Respons error memakai format `{ error: { code, message_id } }` (pesan Bahasa Indonesia ramah).

### 2.1 Cek Loker & Lowongan
| Method | Path | Akses | Body / Query | Respons |
|---|---|---|---|---|
| POST | `/api/job-posts` | 🌐/🔒 | `{ url?, text?, recruiter_contact?, asked_to_pay? }` | `{ job_post_id, fetch_status, needs_text: bool, preview }` |
| POST | `/api/scam-checks` | 🌐/🔒 | `{ job_post_id, turnstile_token? }` | `{ scam_check_id, verdict, risk_score, red_flags[], green_flags[], cannot_verify[], tips[], share_token }` (sinkron, ±5–15 dtk [ASUMSI]) |
| GET | `/api/scam-checks/:id` | 🔒 pemilik | — | detail |
| GET | `/api/public/scam-checks/:shareToken` | 🌐 | — | versi aman (kontak dimasking) |
| POST | `/api/scam-checks/:id/feedback` | 🌐/🔒 | `{ claim, evidence_text }` | `{ status: "pending" }` |
| GET | `/api/me/scam-checks` | 🔒 | `?cursor` | riwayat |

### 2.2 Profil & CV
| Method | Path | Akses | Body | Respons |
|---|---|---|---|---|
| POST | `/api/consents` | 🔒 | `{ purposes: { cv_processing, ai_cross_border, marketing_email, anon_scam_training }, policy_version }` | `{ ok }` |
| POST | `/api/cvs/upload-url` | 🔒 | `{ filename, mime_type, size }` | `{ cv_id, signed_upload_url }` (validasi awal tipe/ukuran) |
| POST | `/api/cvs/:id/parse` | 🔒 | — | `{ profile_draft, redaction_summary, missing_fields }` (memanggil Profile Extractor) |
| GET | `/api/profile` | 🔒 | — | `Profile` + preferences (tanpa vault) |
| PUT | `/api/profile` | 🔒 | `Profile` + `{ confirm: true }` | `{ version }` |
| PUT | `/api/profile/contacts` | 🔒 | `{ full_name, email, phone, city, linkedin }` | `{ ok }` (ke vault terenkripsi) |
| GET | `/api/cvs` | 🔒 | — | daftar CV (asli & tailored) |
| DELETE | `/api/cvs/:id/file` | 🔒 | — | hapus file asli (teks teredaksi tetap) |
| GET | `/api/cvs/:id/download` | 🔒 | `?format=pdf\|docx&include_contacts=true` | file (render on-demand, kontak disisipkan server-side) |

### 2.3 Lamaran & Estafet
| Method | Path | Akses | Body | Respons |
|---|---|---|---|---|
| POST | `/api/applications` | 🔒 | `{ job_post_id, base_cv_id, user_note? }` | `{ application_id }` |
| GET | `/api/applications` | 🔒 | `?status=&cursor=` | list (Tracker) |
| GET | `/api/applications/:id` | 🔒 | — | detail + hasil agen terakhir |
| PATCH | `/api/applications/:id` | 🔒 | `{ status?, notes?, follow_up_at? }` | `{ ok }` (catat ke status_history) |
| POST | `/api/applications/:id/runs` | 🔒 | `{}` (idempoten) | `202 { run_id }` → kirim event Inngest `run.requested` |
| POST | `/api/runs/:id/ack` | 🔒 | `{ acknowledged: true }` | lanjutkan setelah WASPADA |
| POST | `/api/runs/:id/retry` | 🔒 | `{ from_step? }` | ulang langkah yang gagal |
| POST | `/api/runs/:id/cancel` | 🔒 | — | batalkan |
| GET | `/api/runs/:id` | 🔒 | — | status + semua `run_events` (untuk hydrate awal; update berikutnya via Realtime) |
| GET | `/api/runs/:id/report` | 🔒 | `?include_contacts=false` | `text/markdown` attachment |

### 2.4 Tracker & Ringkasan
| Method | Path | Akses | Respons |
|---|---|---|---|
| GET | `/api/tracker/summary` | 🔒 | jumlah per status, panggilan bulan ini (North Star pribadi) |
| GET | `/api/tracker/weekly?week=2026-W45` | 🔒 ⭐ Fase 2 | ringkasan mingguan |

### 2.5 Billing
| Method | Path | Akses | Body | Respons |
|---|---|---|---|---|
| GET | `/api/billing/me` | 🔒 | — | paket, periode, sisa kuota |
| POST | `/api/billing/checkout` | 🔒 | `{ plan: "premium_monthly" }` | `{ invoice_url }` (redirect ke gateway) |
| POST | `/api/webhooks/xendit` *(atau `/midtrans`)* | Gateway | payload | `200` (verifikasi token/signature, idempoten via `webhook_events`) |

### 2.6 Privasi & Akun
| Method | Path | Akses | Respons |
|---|---|---|---|
| GET | `/api/me/export` | 🔒 | `.zip` (profil, CV teredaksi, lamaran, laporan, consent log) |
| DELETE | `/api/me` | 🔒 | `202` → soft delete + jadwal purge (konfirmasi via OTP email) |
| GET | `/api/me/processing-log` | 🔒 | daftar pemrosesan AI (waktu, agen, model; tanpa konten) |

### 2.7 Internal
| Method | Path | Fungsi |
|---|---|---|
| POST | `/api/inngest` | Handler Inngest (signature-verified) untuk fungsi `orchestrate-run`, `parse-cv`, `purge-*` |
| GET | `/api/cron/purge` | Vercel Cron → memicu event purge (retensi, 05 §5) |
| GET | `/api/cron/reminders` | ⭐ Fase 2: pengingat follow-up |
| GET | `/api/health` | health check |

---

## 3. Struktur Folder

```
zjobsagent/
├─ app/
│  ├─ (marketing)/
│  │  ├─ page.tsx                     # Landing
│  │  ├─ harga/page.tsx
│  │  ├─ ciri-loker-palsu/page.mdx
│  │  ├─ privasi/page.mdx
│  │  └─ syarat/page.mdx
│  ├─ cek-loker/
│  │  ├─ page.tsx                     # Form tamu/user
│  │  └─ [checkId]/page.tsx           # Hasil (share_token)
│  ├─ masuk/page.tsx
│  ├─ auth/callback/route.ts
│  ├─ onboarding/
│  │  ├─ persetujuan/page.tsx
│  │  ├─ profil/page.tsx
│  │  ├─ konfirmasi/page.tsx
│  │  └─ preferensi/page.tsx
│  ├─ app/                            # Area login (layout dengan bottom nav)
│  │  ├─ page.tsx                     # Beranda
│  │  ├─ lamaran/baru/page.tsx
│  │  ├─ lamaran/[id]/page.tsx        # Workspace (tabs)
│  │  ├─ lamaran/[id]/diblokir/page.tsx
│  │  ├─ lamaran/[id]/laporan/page.tsx
│  │  ├─ tracker/page.tsx
│  │  └─ cek-loker/page.tsx
│  ├─ pengaturan/{profil,cv,langganan,privasi,notifikasi}/page.tsx
│  └─ api/ …                          # sesuai §2
├─ components/
│  ├─ ui/                             # shadcn
│  ├─ scam/VerdictCard.tsx, RedFlagList.tsx, ReportToOjkButton.tsx
│  ├─ relay/RelayTimeline.tsx, AgentNode.tsx   # timeline estafet
│  ├─ cv/CvPreview.tsx, PlaceholderEditor.tsx
│  └─ tracker/StatusSelect.tsx, ApplicationCard.tsx
├─ lib/
│  ├─ agents/
│  │  ├─ client.ts                    # Anthropic client, retry, fallback, cost calc
│  │  ├─ prompts/{agent1,agent2,agent3,extractor}.v1.ts
│  │  ├─ schemas/{agent1,agent2,agent3,profile}.ts   # Zod
│  │  ├─ agent1.ts, agent2.ts, agent3.ts, extractor.ts
│  │  └─ wrap.ts                      # bungkus data tak tepercaya dalam tag XML
│  ├─ orchestrator/
│  │  ├─ run.ts                       # fungsi Inngest orchestrate-run (state machine)
│  │  ├─ plan.ts                      # template Pembagian Tugas
│  │  ├─ events.ts                    # tulis run_events
│  │  └─ report.ts                    # builder Markdown
│  ├─ scam/
│  │  ├─ rules.ts                     # rule engine (rules_version)
│  │  ├─ gate.ts                      # decideGate()
│  │  └─ cache.ts
│  ├─ validator/antiFabrication.ts
│  ├─ ats/score.ts                    # KeywordCoverage + FormatParseability
│  ├─ ingest/
│  │  ├─ fetchJobPost.ts              # anti-SSRF, robots, limit
│  │  ├─ sanitize.ts                  # hidden text, zero-width, NFKC
│  │  └─ parseCv.ts                   # unpdf, mammoth, magic bytes
│  ├─ pii/redact.ts, vault.ts
│  ├─ render/cvDocx.ts, cvPdf.tsx
│  ├─ billing/{xendit,quota}.ts
│  ├─ ratelimit.ts
│  ├─ supabase/{server,client,admin}.ts
│  └─ db/schema.ts                    # Drizzle
├─ inngest/client.ts, functions.ts
├─ supabase/migrations/*.sql          # tabel, RLS, fungsi
├─ evals/
│  ├─ datasets/{scam,tailor,injection}/*.jsonl
│  └─ run-evals.ts
├─ tests/{unit,e2e}/
├─ blueprint/                         # dokumen ini
├─ .env.example
└─ README.md
```

### Variabel lingkungan (`.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
XENDIT_SECRET_KEY=
XENDIT_WEBHOOK_TOKEN=
RESEND_API_KEY=
PII_VAULT_KEY_ID=
GUEST_HASH_SALT=
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

---

## 4. Estimasi Biaya Infrastruktur (fase awal) [ASUMSI]
Supabase, Vercel, Inngest, Upstash, Resend, Sentry, dan PostHog semuanya memiliki tier gratis/hobby yang kemungkinan cukup untuk beta tertutup. Saat launch publik, rencanakan paket berbayar Supabase dan Vercel. **Cek harga terbaru tiap vendor sebelum launch.** Blueprint ini sengaja tidak mencantumkan angka harga vendor karena berubah-ubah. Biaya dominan diperkirakan berasal dari **token AI** (04 §9).
