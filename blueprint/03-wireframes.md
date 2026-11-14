# 03 — Wireframes (Mobile-First, teks/ASCII)

> Kanvas acuan: **360×780 px** (Android entry–mid). Lebar ASCII ±40 kolom ≈ 1 layar HP.
> Desktop (≥1024 px) memakai layout yang sama dalam kolom tengah maks. 720 px. Khusus workspace, timeline estafet pindah ke sidebar kiri.
> Notasi: `[ Tombol ]`, `( ) radio`, `[x] checkbox`, `▸` link, `≡` menu, `⌄` dropdown/accordion, `▓░` progress.

## Prinsip UI
- **Satu aksi utama per layar.** Tombol utama selalu di zona jempol (bawah, sticky).
- **Warna status:** AMAN = hijau, WASPADA = kuning/amber, PALSU = merah. Setiap warna **selalu disertai ikon + teks**, tidak mengandalkan warna saja (aksesibilitas).
- Teks min. 16 px, area sentuh min. 44 px. Tanpa gambar hero berat (hemat kuota): pakai ilustrasi SVG ringan.
- Skeleton loading + progres estafet supaya penantian 1–3 menit [ASUMSI] tetap terasa jelas.

---

## W1. Landing `/`

```
┌────────────────────────────────────────┐
│ ZJobsAgent                 [Masuk]  ≡  │
├────────────────────────────────────────┤
│                                        │
│  Lebih sering dipanggil interview.     │
│  Bebas loker palsu.                    │
│                                        │
│  Tim AI yang cek keaslian loker,       │
│  sesuaikan CV-mu per lowongan,         │
│  dan latih kamu buat interview.        │
│  Tanpa mengarang pengalaman.           │
│                                        │
│  [  🔍 Cek Loker Gratis — tanpa daftar ]│
│  ▸ Bikin CV untuk lowongan             │
│                                        │
├────────────────────────────────────────┤
│  Kenapa ini penting                    │
│  ┌──────────┐┌──────────┐┌──────────┐  │
│  │ 17,37%   ││ 29.373   ││ 29,4%    │  │
│  │pengangg. ││laporan   ││Gen Z     │  │
│  │usia15–24 ││penipuan  ││pakai AI  │  │
│  │BPS,Mei26 ││kerja ke  ││(nasional │  │
│  │          ││IASC OJK  ││ 18,2%)   │  │
│  │          ││per Ags26 ││APJII 2026│  │
│  └──────────┘└──────────┘└──────────┘  │
│  (scroll horizontal di HP)             │
├────────────────────────────────────────┤
│  Cara kerja: estafet 3 agen            │
│  ① Peneliti Karier & Analis Scam       │
│     ↓  🚧 Gerbang: loker palsu? stop.  │
│  ② Arsitek CV & Lamaran                │
│     ↓                                  │
│  ③ Reviewer HR & Pelatih Interview     │
│  ▸ Lihat contoh laporan                │
├────────────────────────────────────────┤
│  Janji kami                            │
│  ✓ Nggak ngarang pengalaman            │
│  ✓ Data kosong ditandai [isi: ...]     │
│  ✓ CV-mu bisa kamu hapus kapan saja    │
├────────────────────────────────────────┤
│  Harga: Gratis · Premium mulai Rp29rb* │
│  ▸ Lihat paket      *harga sementara   │
├────────────────────────────────────────┤
│ Privasi · Syarat · Ciri loker palsu    │
└────────────────────────────────────────┘
```

---

## W2. Cek Loker `/cek-loker`

```
┌────────────────────────────────────────┐
│ ←  Cek Loker Palsu                     │
├────────────────────────────────────────┤
│  Tempel teks lowongan atau link-nya.   │
│                                        │
│  ( ) Link   (•) Teks                   │
│  ┌──────────────────────────────────┐  │
│  │ Tempel teks lowongan dari WA,    │  │
│  │ IG, Telegram, atau portal...     │  │
│  │                                  │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│  0 / 8.000 karakter                    │
│                                        │
│  ┌ Opsional ────────────────────────┐  │
│  │ Kontak perekrut (email/no. WA)   │  │
│  │ [______________________________] │  │
│  │ Diminta bayar sesuatu? ( )Ya ( )Tdk│ │
│  └──────────────────────────────────┘  │
│                                        │
│  🔒 Teks loker tidak dikaitkan ke      │
│  identitasmu. ▸ Privasi                │
│                                        │
├────────────────────────────────────────┤
│ [          Cek Sekarang  →           ] │
└────────────────────────────────────────┘
```
**Saat mode Link:** input URL. Jika fetch gagal, muncul pesan inline: *"Halaman ini nggak bisa kami buka (mungkin perlu login). Tempel teksnya di sini ya."* Toggle otomatis berpindah ke Teks, dan URL tetap disimpan sebagai sinyal.

**Loading (± 5–15 dtk [ASUMSI]):**
```
│  Agen 1 sedang memeriksa…              │
│  ✓ Membaca teks lowongan               │
│  ✓ Cek pola biaya & data sensitif      │
│  ◌ Menilai kewajaran gaji & kontak     │
│  ▓▓▓▓▓▓▓▓░░░░░░  60%                   │
```

---

## W3a. Hasil Cek — AMAN / WASPADA `/cek-loker/[checkId]`

```
┌────────────────────────────────────────┐
│ ←  Hasil Cek Loker                 ⤴   │
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │ ⚠️  WASPADA                         │ │
│ │ Skor risiko: 48/100                │ │
│ │ "Staff Admin – PT Contoh Jaya"     │ │
│ └────────────────────────────────────┘ │
│                                        │
│  Kenapa waspada?                       │
│  ⌄ Kontak hanya lewat WhatsApp pribadi │
│     Bukti: "hub. WA 08xx (Bu Sari)"    │
│  ⌄ Email pakai domain gratis           │
│  ⌄ Alamat kantor tidak dicantumkan     │
│                                        │
│  Yang terlihat wajar                   │
│  ✓ Tidak ada permintaan biaya          │
│  ✓ Kualifikasi & gaji masuk akal       │
│                                        │
│  Cek sendiri sebelum lanjut:           │
│  [ ] Ada di situs karier resmi?        │
│  [ ] HR pakai email domain perusahaan? │
│  [ ] Tidak diminta bayar apa pun?      │
│                                        │
│  ℹ️ Ini indikasi berbasis AI, bukan     │
│  putusan hukum.                        │
├────────────────────────────────────────┤
│ [ ✍️ Sesuaikan CV untuk loker ini  → ] │
│   ▸ Cek loker lain                     │
└────────────────────────────────────────┘
```
Untuk **AMAN**, kartunya hijau ✅ dengan judul *"Tidak ditemukan tanda penipuan"*. Checklist verifikasi tetap ada tapi dilipat.

---

## W3b. Gerbang PALSU (tamu & workspace)

```
┌────────────────────────────────────────┐
│ ←  Hasil Cek Loker                     │
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │ ⛔  TERINDIKASI PALSU               │ │
│ │ Proses dihentikan demi keamananmu. │ │
│ │ Kuota CV-mu tidak terpakai.        │ │
│ └────────────────────────────────────┘ │
│                                        │
│  🚩 Tanda penipuan yang ditemukan      │
│  1. Minta biaya "pelatihan" Rp350rb    │
│     "transfer ke rek a.n. pribadi…"    │
│  2. Minta foto KTP + selfie di awal    │
│  3. Gaji tidak wajar untuk posisi ini  │
│  4. Desakan: "kuota terbatas hari ini" │
│                                        │
│  🛡️ Lakukan sekarang                    │
│  • Jangan transfer uang apa pun        │
│  • Jangan kirim KTP, KK, OTP, PIN      │
│  • Simpan bukti chat, lalu blokir      │
│                                        │
│  ⌄ Sudah terlanjur transfer/kirim data?│
│                                        │
│ [  📣 Lapor ke IASC OJK  ↗            ] │
│ [  📋 Salin ringkasan bukti           ] │
│ [  ⤴ Bagikan peringatan ke teman      ] │
│                                        │
│  ▸ Menurutmu ini salah deteksi?        │
├────────────────────────────────────────┤
│ [          Cek loker lain            ] │
└────────────────────────────────────────┘
```
"Lapor ke IASC OJK" membuka `https://iasc.ojk.go.id` di tab baru. "Salin ringkasan bukti" menyalin teks berisi nama perusahaan yang diklaim, kontak, permintaan biaya, dan kutipan.

---

## W4. Masuk `/masuk`

```
┌────────────────────────────────────────┐
│ ←                                      │
├────────────────────────────────────────┤
│  Masuk / Daftar ZJobsAgent             │
│                                        │
│  [  G  Lanjut dengan Google          ] │
│                                        │
│  ─────────── atau ───────────          │
│  Email                                 │
│  [______________________________]      │
│  [      Kirim kode masuk ke email    ] │
│                                        │
│  Dengan lanjut, kamu setuju dengan     │
│  ▸ Syarat & ▸ Kebijakan Privasi        │
└────────────────────────────────────────┘
```
Setelah kirim, layar berganti ke input 6 digit OTP **sekaligus** link ajaib di email. Ini antisipasi email yang dibuka di app berbeda dari browser.

---

## W5. Onboarding — Persetujuan `/onboarding/persetujuan`

```
┌────────────────────────────────────────┐
│  Langkah 1/4  ▓░░░                     │
├────────────────────────────────────────┤
│  Sebelum mulai, ini cara kami          │
│  memakai datamu:                       │
│                                        │
│  [x] WAJIB · Memproses CV & profilmu   │
│      untuk membuat analisis dan CV.    │
│      ⌄ Data apa saja?                  │
│  [x] WAJIB · Mengirim data yang sudah  │
│      disamarkan (tanpa NIK, alamat,    │
│      no. HP) ke penyedia AI di luar    │
│      negeri untuk diproses.            │
│      ⌄ Siapa penyedianya & kenapa?     │
│  [ ] Opsional · Email pengingat & tips │
│  [ ] Opsional · Teks loker anonim      │
│      dipakai meningkatkan deteksi scam │
│                                        │
│  Kamu bisa cabut persetujuan & hapus   │
│  semua data kapan saja di Pengaturan.  │
├────────────────────────────────────────┤
│ [            Setuju & lanjut         ] │
│   ▸ Hanya pakai cek loker              │
└────────────────────────────────────────┘
```

## W6. Onboarding — Profil `/onboarding/profil`

```
┌────────────────────────────────────────┐
│  Langkah 2/4  ▓▓░░                     │
├────────────────────────────────────────┤
│  Upload CV-mu                          │
│  ┌──────────────────────────────────┐  │
│  │      📄  Ketuk untuk pilih file   │  │
│  │      PDF / DOCX · maks 5 MB      │  │
│  └──────────────────────────────────┘  │
│                                        │
│  💡 Tips: hapus NIK, alamat lengkap,   │
│  tgl lahir, agama, & foto dari CV.     │
│  Kami juga menyamarkannya otomatis.    │
│                                        │
│  ─────────── atau ───────────          │
│  ▸ Belum punya CV? Isi profil manual   │
│    (±5 menit)                          │
├────────────────────────────────────────┤
│ [              Lanjut                ] │
└────────────────────────────────────────┘
```

## W7. Onboarding — Konfirmasi Profil `/onboarding/konfirmasi`

```
┌────────────────────────────────────────┐
│  Langkah 3/4  ▓▓▓░                     │
├────────────────────────────────────────┤
│  Cek dulu ya. Ini jadi "sumber         │
│  kebenaran"; agen cuma boleh pakai     │
│  data di sini.                         │
│                                        │
│  ⌄ Pendidikan (1)                 ✏️    │
│    S1 Manajemen · Univ. X · 2025       │
│    IPK: [isi: IPK, opsional]           │
│  ⌄ Pengalaman (2)                 ✏️    │
│    Magang Marketing · CV Y · 3 bln     │
│    • Kelola konten IG toko             │
│    • Hasil: [isi: angka/hasil nyata?]  │
│  ⌄ Organisasi & proyek (1)        ✏️    │
│  ⌄ Skill (8)                      ✏️    │
│  ⌄ Sertifikat (0)                 ＋    │
│                                        │
│  🔒 Disamarkan: NIK, alamat, tgl lahir │
│                                        │
│  ⚠️ 3 bagian masih [isi: …]. Boleh      │
│  dilewati, tapi hasil lebih kuat jika  │
│  diisi.                                │
├────────────────────────────────────────┤
│ [         Profil sudah benar →       ] │
└────────────────────────────────────────┘
```
Langkah 4/4 (Preferensi): posisi incaran (chip), kota/remote, bahasa CV default (Otomatis ikut lowongan / ID / EN), status (fresh grad / SMK / berpengalaman).

---

## W8. Beranda App `/app`

```
┌────────────────────────────────────────┐
│ ZJobsAgent                    👤   ≡   │
├────────────────────────────────────────┤
│  Hai, Rina 👋                           │
│  ┌────────────────────────────────────┐│
│  │ Bulan ini: 1/3 CV terpakai         ││
│  │ Panggilan interview: 1 🎉           ││
│  │ ▸ Upgrade Premium                  ││
│  └────────────────────────────────────┘│
│                                        │
│  Lamaran terakhir                      │
│  ┌────────────────────────────────────┐│
│  │ Staff Admin · PT Contoh   ✅ AMAN   ││
│  │ Status: Dikirim · 5 hari lalu      ││
│  │ ATS 52 → 81   ▸ Buka               ││
│  ├────────────────────────────────────┤│
│  │ Sales Exec · PT ???       ⛔ PALSU  ││
│  │ Diblokir · ▸ Lihat alasan          ││
│  └────────────────────────────────────┘│
│  ▸ Semua lamaran (Tracker)             │
├────────────────────────────────────────┤
│ [   ＋ Lamaran baru   ] [ 🔍 Cek loker ]│
├────────────────────────────────────────┤
│  🏠 Beranda  📋 Tracker  🔍 Cek  ⚙️ Akun │
└────────────────────────────────────────┘
```

## W9. Lamaran Baru `/app/lamaran/baru`

```
┌────────────────────────────────────────┐
│ ←  Lamaran Baru                        │
├────────────────────────────────────────┤
│  1. Lowongan                           │
│  ( ) Link  (•) Teks                    │
│  ┌──────────────────────────────────┐  │
│  │ (otomatis terisi jika datang dari│  │
│  │  hasil cek loker)                │  │
│  └──────────────────────────────────┘  │
│                                        │
│  2. CV dasar                           │
│  [ CV Utama (Okt 2026)            ⌄ ]  │
│                                        │
│  3. Catatan untuk agen (opsional)      │
│  [ mis. "aku lebih minat ke tim     ]  │
│  [  digital marketing"              ]  │
│                                        │
│  Pakai 1 dari 2 sisa kuota bulan ini.  │
│  Tidak terpotong jika loker PALSU.     │
├────────────────────────────────────────┤
│ [       🚀 Mulai Estafet Agen        ] │
└────────────────────────────────────────┘
```

---

## W10. Workspace — Tab Estafet `/app/lamaran/[id]`

```
┌────────────────────────────────────────┐
│ ←  Staff Admin · PT Contoh Jaya    ⋮   │
├────────────────────────────────────────┤
│ [Estafet] Analisis  CV&Surat  Review   │
├────────────────────────────────────────┤
│  🧭 Lead Orchestrator          ✓ 0:02   │
│  │ Membagi tugas ke 3 agen.            │
│  │ ⌄ Lihat pembagian tugas             │
│  │                                     │
│  🔎 Agen 1 · Peneliti & Analis Scam ✓   │
│  │ • Membaca lowongan (EN terdeteksi)  │
│  │ • 12 kata kunci utama ditemukan     │
│  │ • Status loker: ✅ AMAN              │
│  │ • Akar masalah: 3 temuan            │
│  │ ⌄ Detail                            │
│  │                                     │
│  🚧 Gerbang Scam              ✓ Lolos   │
│  │                                     │
│  📝 Agen 2 · Arsitek CV       ◌ Proses  │
│  │ • Menyusun ringkasan profil…        │
│  │ • Memetakan 9/12 kata kunci…        │
│  │ ▓▓▓▓▓▓░░░░                          │
│  │                                     │
│  🎯 Agen 3 · Reviewer HR      ○ Antre   │
│  │                                     │
│  ℹ️ Boleh tutup halaman; progres        │
│  tersimpan & lanjut otomatis.          │
├────────────────────────────────────────┤
│ [  Lihat hasil (tersedia per tahap)  ] │
└────────────────────────────────────────┘
```
Status node: `○ Antre`, `◌ Proses`, `✓ Selesai`, `↻ Mencoba ulang (2/3)`, `✕ Gagal [Coba lagi]`, `⛔ Dihentikan`.
Jika Agen 3 meminta revisi, muncul node tambahan: `📝 Agen 2 · Revisi (1/1)`.

## W11. Tab Analisis (Agen 1)

```
│ Estafet [Analisis] CV&Surat  Review    │
├────────────────────────────────────────┤
│  Kecocokan profil: 64/100              │
│  ▓▓▓▓▓▓░░░░                            │
│                                        │
│  Kenapa mungkin belum dipanggil:       │
│  1. CV tidak memuat kata kunci         │
│     "data entry", "Excel", "SAP"       │
│  2. Pengalaman magang tidak            │
│     menunjukkan hasil terukur          │
│  3. Ringkasan profil terlalu umum      │
│                                        │
│  Cocok ✓        Kurang ✗               │
│  Excel          SAP (belum ada)        │
│  Komunikasi     Pengalaman 1 thn       │
│                                        │
│  Status loker: ✅ AMAN  ▸ alasan        │
```

## W12. Tab CV & Surat (Agen 2)

```
│ Estafet Analisis [CV&Surat] Review     │
├────────────────────────────────────────┤
│  CV untuk lowongan ini  (EN)           │
│  ┌────────────────────────────────────┐│
│  │ RINA PUTRI                         ││
│  │ [email] · [no. HP] · LinkedIn      ││
│  │ SUMMARY                            ││
│  │ Management graduate with …         ││
│  │ EXPERIENCE                         ││
│  │ Marketing Intern — CV Y            ││
│  │ • Managed IG content for …         ││
│  │ • [isi: hasil terukur, mis.        ││
│  │   kenaikan followers]  ⚠️           ││
│  └────────────────────────────────────┘│
│  ⚠️ 2 placeholder perlu kamu isi        │
│  [ ✏️ Isi placeholder ]                 │
│                                        │
│  [ ⬇ PDF ]  [ ⬇ DOCX ]                 │
│                                        │
│  ⌄ Surat lamaran           [Salin]     │
│  ⌄ Pesan ke HR: Email · WA · LinkedIn  │
│  ⌄ Strategi lamaran (3 langkah)        │
│  ⌄ Apa yang diubah & kenapa (diff)     │
```
Data kontak ditampilkan sebagai token di pratinjau dan baru disisipkan saat render file. Tujuannya agar kontak tidak pernah dikirim ke LLM.

## W13. Tab Review & Interview (Agen 3)

```
│ Estafet Analisis CV&Surat [Review]     │
├────────────────────────────────────────┤
│  Estimasi Skor ATS                     │
│  Sebelum  52 ▓▓▓▓▓░░░░░                │
│  Sesudah  81 ▓▓▓▓▓▓▓▓░░  (+29)         │
│  ℹ️ Estimasi internal, bukan skor ATS   │
│  milik perusahaan.                     │
│                                        │
│  Kata HR (jujur):                      │
│  👍 Ringkasan langsung relevan          │
│  👎 Belum ada angka hasil magang        │
│  👎 Skill SAP belum ada → siapkan       │
│     jawaban jujur saat ditanya         │
│                                        │
│  5 Pertanyaan Interview                │
│  ⌄ 1. Ceritakan pengalaman magangmu    │
│     Kerangka STAR:                     │
│     S: [dari profil] T: … A: … R: [isi]│
│  ⌄ 2. Kenapa tertarik di PT Contoh?    │
│  ⌄ 3. …                                │
├────────────────────────────────────────┤
│ [ 📋 Simpan ke Tracker ] [ ⬇ Laporan ] │
└────────────────────────────────────────┘
```

## W14. Laporan `/app/lamaran/[id]/laporan`

```
┌────────────────────────────────────────┐
│ ←  Multi-Agent Orchestration Report    │
├────────────────────────────────────────┤
│  # Konteks                             │
│  Posisi, perusahaan, sumber, tanggal   │
│  # Pembagian Tugas                     │
│  Tabel agen → tugas → input → output   │
│  # Ringkasan Estafet                   │
│  Timeline + keputusan gerbang          │
│  # Hasil Akhir                         │
│  CV final, skor, pertanyaan interview  │
│  (pratinjau Markdown terender)         │
├────────────────────────────────────────┤
│ [ ⬇ Unduh .md ]  [ 📋 Salin ]           │
└────────────────────────────────────────┘
```

## W15. Tracker Lite `/app/tracker`

```
┌────────────────────────────────────────┐
│  Tracker Lamaran               🔍  ⏷   │
├────────────────────────────────────────┤
│  Semua(7) Dikirim(3) Dipanggil(1) …    │
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │ Staff Admin · PT Contoh Jaya       │ │
│ │ [ Dikirim            ⌄ ]           │ │
│ │ Dikirim 5 hr lalu · ATS 81         │ │
│ │ 💬 Belum ada kabar? ▸ Pesan follow-up│ │
│ ├────────────────────────────────────┤ │
│ │ Data Entry · PT Maju               │ │
│ │ [ Dipanggil 🎉        ⌄ ]           │ │
│ │ ▸ Latihan 5 pertanyaan interview   │ │
│ └────────────────────────────────────┘ │
│  Tab: Diblokir (1)                     │
├────────────────────────────────────────┤
│  🏠 Beranda  📋 Tracker  🔍 Cek  ⚙️ Akun │
└────────────────────────────────────────┘
```
Fase 2: tampilan kanban (geser horizontal), tanggal follow-up, ringkasan mingguan.

## W16. Pricing `/harga`

```
┌────────────────────────────────────────┐
│ ←  Paket                               │
├────────────────────────────────────────┤
│ ┌ GRATIS ────────────────── Rp0 ─────┐ │
│ │ ✓ Cek loker palsu tanpa batas*     │ │
│ │ ✓ 3 CV disesuaikan / bulan         │ │
│ │ ✓ Tracker & laporan                │ │
│ │ [ Mulai gratis ]                   │ │
│ └────────────────────────────────────┘ │
│ ┌ PREMIUM ───── Rp[29–49]rb/bln ─────┐ │
│ │ ✓ [N] CV / bulan                   │ │
│ │ ✓ Antrean prioritas                │ │
│ │ ◌ Latihan interview suara (segera) │ │
│ │ ◌ Pengingat follow-up (segera)     │ │
│ │ [ Langganan ]  QRIS·e-wallet·VA    │ │
│ └────────────────────────────────────┘ │
│ ┌ KAMPUS / SMK / BKK ─────────────────┐│
│ │ Dashboard penyerapan lulusan       ││
│ │ [ Gabung waitlist ]                ││
│ └────────────────────────────────────┘│
│ *wajar pakai (fair use)                │
└────────────────────────────────────────┘
```

## W17. Pengaturan — Privasi `/pengaturan/privasi`

```
┌────────────────────────────────────────┐
│ ←  Privasi & Data                      │
├────────────────────────────────────────┤
│  Persetujuan                           │
│  [x] Pemrosesan CV (wajib)   ▸ Cabut   │
│  [x] Pemrosesan AI luar negeri ▸ Cabut │
│  [ ] Email pengingat                   │
│  [ ] Data anonim untuk deteksi scam    │
│                                        │
│  Data saya                             │
│  ▸ Lihat & unduh semua data (.zip)     │
│  ▸ Hapus file CV asli                  │
│  ▸ Riwayat pemrosesan AI               │
│                                        │
│  Retensi: file CV asli dihapus otomatis│
│  [30] hari setelah diunggah.           │
│                                        │
│  ────────────────────────────────────  │
│  [ 🗑 Hapus akun & semua data ]  (merah)│
│  Diproses ≤ [N] hari; konfirmasi email │
└────────────────────────────────────────┘
```
