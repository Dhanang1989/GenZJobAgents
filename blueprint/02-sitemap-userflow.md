# 02 — Sitemap & User Flow

> Konvensi: 🌐 = publik (tamu), 🔒 = butuh login, ⭐ = fitur Premium/fase berikutnya.

---

## 1. Sitemap

```mermaid
graph TD
    ROOT["/ Landing 🌐"]

    ROOT --> CEK["/cek-loker 🌐<br/>Cek Loker Palsu"]
    CEK --> CEKHASIL["/cek-loker/[checkId] 🌐<br/>Hasil AMAN/WASPADA/PALSU"]
    ROOT --> HARGA["/harga 🌐<br/>Pricing"]
    ROOT --> EDU["/ciri-loker-palsu 🌐<br/>Edukasi tanda penipuan"]
    ROOT --> LEGAL["/privasi · /syarat 🌐"]

    ROOT --> AUTH["/masuk 🌐<br/>Magic link / OTP email / Google"]
    AUTH --> CALLBACK["/auth/callback"]
    CALLBACK --> ONB["/onboarding 🔒"]
    ONB --> ONB1["/onboarding/persetujuan<br/>Consent UU PDP"]
    ONB --> ONB2["/onboarding/profil<br/>Upload CV / isi manual"]
    ONB --> ONB3["/onboarding/konfirmasi<br/>Cek hasil parse"]
    ONB --> ONB4["/onboarding/preferensi<br/>Posisi, lokasi, bahasa"]

    ONB4 --> APP["/app 🔒<br/>Beranda"]
    APP --> NEW["/app/lamaran/baru 🔒<br/>Tempel teks/link lowongan"]
    NEW --> WS["/app/lamaran/[id] 🔒<br/>Workspace Lamaran"]
    WS --> WS1["Tab: Estafet (timeline)"]
    WS --> WS2["Tab: Analisis (Agen 1)"]
    WS --> WS3["Tab: CV & Surat (Agen 2)"]
    WS --> WS4["Tab: Review & Interview (Agen 3)"]
    WS --> BLOCK["/app/lamaran/[id]/diblokir 🔒<br/>Gerbang PALSU"]
    WS --> REP["/app/lamaran/[id]/laporan 🔒<br/>Preview & unduh .md"]

    APP --> TRK["/app/tracker 🔒<br/>Daftar & status lamaran"]
    TRK --> TRKW["/app/tracker/mingguan ⭐<br/>Ringkasan mingguan (Fase 2)"]
    APP --> CEKU["/app/cek-loker 🔒<br/>Riwayat cek loker"]

    APP --> SET["/pengaturan 🔒"]
    SET --> SET1["/pengaturan/profil"]
    SET --> SET2["/pengaturan/cv<br/>CV saya (versi)"]
    SET --> SET3["/pengaturan/langganan<br/>Paket & tagihan"]
    SET --> SET4["/pengaturan/privasi<br/>Consent, ekspor, hapus akun"]
    SET --> SET5["/pengaturan/notifikasi ⭐"]
    SET3 --> PAY["/bayar/[invoiceId]<br/>Redirect payment gateway"]
```

### Daftar halaman

| Path | Akses | Tujuan | MVP? |
|---|---|---|---|
| `/` | 🌐 | Landing: masalah (data latar), cara kerja estafet, CTA "Cek loker sekarang" | ✅ |
| `/cek-loker` | 🌐 | Form tempel teks/link (captcha tak terlihat untuk tamu) | ✅ |
| `/cek-loker/[checkId]` | 🌐 | Hasil cek. Bisa dibagikan lewat link tanpa PII | ✅ |
| `/ciri-loker-palsu` | 🌐 | Konten edukasi (SEO) | ✅ (statis) |
| `/harga` | 🌐 | Paket Gratis / Premium / B2B (waitlist) | ✅ |
| `/privasi`, `/syarat` | 🌐 | Kebijakan privasi & S&K | ✅ |
| `/masuk` | 🌐 | Login/daftar jadi satu | ✅ |
| `/onboarding/*` | 🔒 | Consent → profil → konfirmasi → preferensi | ✅ |
| `/app` | 🔒 | Beranda: kuota, lamaran terakhir, CTA "Lamaran baru" | ✅ |
| `/app/lamaran/baru` | 🔒 | Input lowongan + pilih CV dasar | ✅ |
| `/app/lamaran/[id]` | 🔒 | Workspace estafet (4 tab) | ✅ |
| `/app/lamaran/[id]/diblokir` | 🔒 | Layar gerbang PALSU | ✅ |
| `/app/lamaran/[id]/laporan` | 🔒 | Laporan Markdown | ✅ |
| `/app/tracker` | 🔒 | Tracker Lite (list + ubah status) | ✅ lite |
| `/app/tracker/mingguan` | 🔒 | Ringkasan mingguan | ⭐ Fase 2 |
| `/app/cek-loker` | 🔒 | Riwayat cek loker milik user | ✅ |
| `/pengaturan/*` | 🔒 | Profil, CV, langganan, privasi, notifikasi | ✅ (notifikasi Fase 2) |

---

## 2. User Flow Utama (Happy Path)

```mermaid
flowchart TD
    A([Pengguna masuk dari TikTok/IG/WA/Google]) --> B["Landing /"]
    B --> C{"Mau apa?"}
    C -->|Cek loker dulu| D["/cek-loker<br/>tempel teks / link"]
    C -->|Langsung bikin CV| L["/masuk"]

    D --> E["Ambil isi link (jika ada)<br/>gagal → minta tempel teks"]
    E --> F["Agen 1 (mode cek cepat)<br/>+ aturan deterministik"]
    F --> G{"Status?"}
    G -->|PALSU| X[["Alur PALSU (lihat §3)"]]
    G -->|WASPADA| H["Tampilkan tanda waspada<br/>+ checklist verifikasi"]
    G -->|AMAN| I["Tampilkan 'Tidak ditemukan<br/>tanda penipuan'"]
    H --> J{"CTA: Sesuaikan CV<br/>untuk loker ini?"}
    I --> J
    J -->|Ya, belum login| L
    J -->|Tidak| Z([Selesai / bagikan hasil])

    L --> M{"User baru?"}
    M -->|Ya| N["Onboarding: Consent UU PDP"]
    N --> O["Upload CV PDF/DOCX<br/>atau isi profil manual"]
    O --> P["Parse + redaksi PII<br/>→ konfirmasi profil oleh user"]
    P --> Q["Preferensi (posisi, kota, bahasa)"]
    M -->|Tidak| R
    Q --> R["/app/lamaran/baru<br/>lowongan dari cek loker terbawa otomatis"]

    R --> S{"Kuota tersedia?"}
    S -->|Tidak| S2["Upsell Premium / tunggu bulan depan"]
    S -->|Ya| T["Lead Orchestrator membagi tugas<br/>(timeline estafet tampil)"]
    T --> U["Agen 1: Analisis profil vs lowongan<br/>+ cek scam lengkap"]
    U --> V{"GERBANG"}
    V -->|PALSU| X
    V -->|WASPADA| V2["User konfirmasi 'Saya paham risikonya'"]
    V2 --> W
    V -->|AMAN| W["Agen 2: CV tailor + surat lamaran<br/>+ pesan HR + strategi"]
    W --> W3["Validator anti-fabrikasi (kode)"]
    W3 --> Y["Agen 3: Skor ATS sebelum/sesudah,<br/>kritik HR, versi final, 5 pertanyaan interview"]
    Y --> Y2{"Skor sesudah < ambang<br/>atau ada temuan fabrikasi?"}
    Y2 -->|Ya, maks 1x| W
    Y2 -->|Tidak| AA["Workspace lengkap:<br/>unduh CV PDF/DOCX, salin surat/pesan"]
    AA --> AB["Simpan ke Tracker (status: Disimpan)"]
    AB --> AC["User kirim lamaran sendiri<br/>→ ubah status: Dikirim"]
    AC --> AD["Unduh Laporan Markdown (opsional)"]
    AC --> AE["Update status: Dipanggil / Interview /<br/>Diterima / Ditolak → North Star"]
```

---

## 3. Alur saat Loker PALSU

```mermaid
flowchart TD
    A["Agen 1 + aturan → status PALSU"] --> B["Orchestrator: hentikan estafet<br/>(Agen 2 & 3 TIDAK dijalankan,<br/>kuota CV TIDAK dipotong)"]
    B --> C["Simpan scam_check (verdict=PALSU)<br/>application.status = 'diblokir'"]
    C --> D["Layar Gerbang PALSU"]
    D --> D1["🚩 Daftar tanda penipuan<br/>+ kutipan bukti dari teks lowongan"]
    D --> D2["🛡️ Yang harus dilakukan sekarang:<br/>jangan transfer, jangan kirim KTP/OTP,<br/>blokir kontak"]
    D --> D3["📣 Tombol: Lapor ke IASC OJK<br/>(buka iasc.ojk.go.id di tab baru)"]
    D --> D4["📋 Tombol: Salin ringkasan bukti<br/>(untuk dilampirkan saat melapor)"]
    D --> D5["🔁 Tombol: Bagikan peringatan<br/>(link hasil tanpa PII)"]
    D --> D6["❓ Tautan: Laporkan salah deteksi"]
    D --> D7["➡️ CTA: Cek loker lain"]

    D3 --> E["Catat event 'report_clicked'<br/>(untuk metrik)"]
    D6 --> F["Form singkat: alasan + bukti<br/>(mis. link karier resmi perusahaan)"]
    F --> G["Masuk antrean tinjauan manual<br/>(scam_feedback). Status TETAP PALSU<br/>sampai ditinjau"]
    G --> H{"Hasil tinjauan"}
    H -->|Salah deteksi| I["Ubah verdict → WASPADA/AMAN,<br/>notifikasi user, tambah ke eval set"]
    H -->|Benar PALSU| J["Tetap, tambahkan ke eval set"]

    D1 -.->|"Sudah terlanjur transfer/kirim data?"| K["Panel darurat:<br/>hubungi bank untuk blokir,<br/>ganti password/PIN, simpan bukti chat,<br/>lapor ke IASC OJK"]
```

**Aturan alur PALSU:**
- Tidak ada tombol "lanjutkan tetap bikin CV" di MVP (keputusan desain, lihat README).
- Kuota CV pengguna **tidak** dipotong untuk lamaran yang diblokir.
- Pada mode tamu, layar yang sama tampil di `/cek-loker/[checkId]` dengan CTA daftar diganti "Cek loker lain".

---

## 4. Alur WASPADA (ringkas)

```mermaid
flowchart LR
    A["Status WASPADA"] --> B["Tampilkan sinyal waspada<br/>+ hal yang belum bisa diverifikasi"]
    B --> C["Checklist verifikasi mandiri:<br/>cek situs karier resmi, email domain resmi,<br/>tidak ada permintaan biaya"]
    C --> D{"User centang<br/>'Saya paham risikonya'"}
    D -->|Ya| E["Estafet lanjut ke Agen 2<br/>(banner WASPADA tetap tampil<br/>di workspace & laporan)"]
    D -->|Tidak| F["Simpan sebagai draft,<br/>tidak memotong kuota"]
```

---

## 5. Alur Onboarding & Consent

```mermaid
flowchart TD
    A["Login pertama"] --> B["Layar Persetujuan"]
    B --> B1["☑ Wajib: Pemrosesan data CV untuk layanan"]
    B --> B2["☑ Wajib: Pemrosesan oleh penyedia AI di luar negeri<br/>(setelah PII sensitif diredaksi)"]
    B --> B3["☐ Opsional: Email pengingat & tips"]
    B --> B4["☐ Opsional: Data anonim untuk peningkatan model deteksi scam"]
    B1 & B2 --> C{"Wajib dicentang?"}
    C -->|Tidak| C2["Hanya fitur cek loker yang aktif"]
    C -->|Ya| D["Upload CV / isi manual"]
    D --> E["Validasi file (tipe, ukuran, halaman)"]
    E -->|Gagal| E2["Pesan ramah + opsi isi manual"]
    E -->|OK| F["Ekstrak teks → deteksi & redaksi PII<br/>(NIK, alamat lengkap, tgl lahir, agama, status, foto)"]
    F --> G["Parse jadi profil terstruktur (LLM)"]
    G --> H["User konfirmasi/edit tiap bagian<br/>+ isi placeholder kosong"]
    H --> I["Profil tersimpan = sumber kebenaran<br/>untuk validator anti-fabrikasi"]
```

---

## 6. Alur Tracker (MVP Lite → Fase 2)

```mermaid
stateDiagram-v2
    [*] --> Disimpan: estafet selesai
    Disimpan --> Dikirim: user tandai terkirim
    Dikirim --> Dipanggil: HR menghubungi
    Dikirim --> Ditolak
    Dipanggil --> Interview: jadwal interview
    Dipanggil --> Ditolak
    Interview --> Diterima
    Interview --> Ditolak
    Diterima --> [*]
    Ditolak --> [*]
    Disimpan --> Diarsipkan: tidak jadi melamar
    note right of Dikirim
        Fase 2: pengingat follow-up
        otomatis H+7 (asumsi) jika
        status belum berubah
    end note
```

Status khusus `diblokir` (gerbang PALSU) tidak masuk siklus tracker. Lamaran seperti ini tampil di tab terpisah "Diblokir".
