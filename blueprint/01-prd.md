# 01 — Product Requirements Document (PRD): ZJobsAgent

> Status: **DRAFT untuk persetujuan** · Versi 0.1 · 5 November 2026
> Konvensi: label **[ASUMSI]** berarti hipotesis yang belum divalidasi. Angka statistik **hanya** berasal dari data latar yang diberikan pemilik produk.

---

## 1. Ringkasan Produk

**ZJobsAgent** adalah web app *mobile-first* berbasis sistem multi-agent AI yang membantu fresh graduate dan Gen Z di Indonesia agar:
1. **Lebih sering dipanggil interview**: CV dan lamaran disesuaikan per lowongan, lalu direview dari sudut pandang HR.
2. **Terhindar dari lowongan kerja palsu**: setiap lowongan dicek dulu sebelum pengguna menghabiskan waktu, uang, atau data pribadinya.

Pembedanya adalah **orkestrasi estafet yang transparan**. Pengguna bisa melihat tiap agen bekerja secara berurutan (seperti timeline), dan ada **gerbang anti-scam** yang menghentikan proses jika lowongan terdeteksi PALSU.

---

## 2. Problem Statement

### 2.1 Data latar (dari pemilik produk)
| Indikator | Angka | Sumber |
|---|---|---|
| Tingkat pengangguran usia 15–24 tahun | **17,37%** | BPS, Mei 2026 |
| Laporan penipuan kerja ke IASC OJK | **29.373 laporan** | IASC OJK, per Agustus 2026 |
| Adopsi AI di Gen Z vs rata-rata nasional | **29,4%** vs **18,2%** | APJII 2026 |

### 2.2 Masalah yang dihadapi pengguna
| # | Masalah | Dampak |
|---|---|---|
| P1 | CV generik dikirim ke banyak lowongan dan tidak lolos penyaringan awal (ATS/HR) | Jarang dipanggil, motivasi turun, tidak tahu letak kesalahannya |
| P2 | Pengguna tidak tahu **akar masalah** kenapa tidak dipanggil (kata kunci, struktur, relevansi, atau ekspektasi posisi) | Mengulang kesalahan yang sama |
| P3 | Loker palsu beredar di WhatsApp, Telegram, media sosial, bahkan portal resmi. Modusnya antara lain minta biaya, minta data KTP/rekening, atau "kerja tugas" | Kerugian uang, data pribadi bocor, trauma |
| P4 | Tools AI generik (chatbot umum) cenderung **mengarang pengalaman** saat diminta "bagusin CV" | CV tidak jujur, berisiko saat interview atau verifikasi |
| P5 | Lamaran tidak terlacak, follow-up terlupa | Peluang hilang |

### 2.3 Insight kunci [ASUMSI, perlu divalidasi lewat wawancara pengguna]
- Gen Z sudah nyaman memakai AI (data APJII), tetapi butuh hasil yang **spesifik untuk lowongan tertentu** dan **dapat dipercaya**.
- Rasa aman ("ini loker asli nggak?") adalah pemicu awal yang kuat dan berfrekuensi tinggi. Karena itu, cek loker palsu gratis tanpa login dijadikan pintu masuk akuisisi.

---

## 3. Target User & Persona

> Persona di bawah ini **ilustratif** dan disusun dari konteks masalah. Detailnya bukan data riset dan harus divalidasi dengan 8–12 wawancara pengguna di minggu 1–2.

### Persona A — "Rina", Fresh Graduate S1 (22 th)
- **Latar:** Lulusan S1 Manajemen dari kampus swasta di kota tier-2. Melamar ke banyak lowongan staf admin/marketing lewat portal kerja dan Instagram.
- **Perangkat:** HP Android kelas menengah, sering pakai kuota data.
- **Frustrasi:** "Udah kirim CV ke mana-mana, nggak ada yang manggil. Nggak tahu salahnya di mana."
- **Butuh:** Diagnosis jujur, CV yang menyasar kata kunci lowongan, surat lamaran singkat, latihan interview.
- **Fitur utama:** Agen 1 (akar masalah), Agen 2 (CV tailor), Agen 3 (skor & kritik HR).

### Persona B — "Bayu", Lulusan SMK (19 th)
- **Latar:** Lulusan SMK TKJ, mencari kerja pertama. Banyak menemukan loker dari grup WhatsApp/Facebook dan broadcast.
- **Perangkat:** HP Android entry-level, layar kecil, kuota terbatas.
- **Frustrasi:** Pernah diminta "biaya seragam/pelatihan" dan ragu apakah loker itu asli.
- **Butuh:** Cek loker cepat (tempel teks dari WA), penjelasan sederhana, arahan lapor.
- **Fitur utama:** Cek Loker Palsu (tanpa login), gerbang PALSU, edukasi ciri-ciri penipuan.

### Persona C — "Dimas", Early Career / Career Switcher (24 th)
- **Latar:** Pengalaman kerja 1–2 tahun, ingin pindah ke startup/perusahaan multinasional. Lowongannya sering berbahasa Inggris.
- **Perangkat:** HP + laptop.
- **Frustrasi:** CV-nya tidak menonjolkan transferable skills dan tidak ramah ATS.
- **Butuh:** CV berbahasa Inggris sesuai lowongan, strategi lamaran (referral, pesan ke HR di LinkedIn), persiapan interview.
- **Fitur utama:** CV ID/EN otomatis mengikuti bahasa lowongan, pesan ke HR, Tracker. Kandidat kuat untuk Premium.

### Non-target (MVP)
- Rekruter/perusahaan yang ingin memasang lowongan.
- Posisi senior/eksekutif.
- B2B kampus/SMK/BKK. Segmen ini masuk **Fase 3**.

---

## 4. Value Proposition

**Untuk** fresh graduate dan Gen Z Indonesia **yang** sering melamar tapi jarang dipanggil dan rawan tertipu loker palsu, **ZJobsAgent** adalah **tim asisten karier AI** yang **mengecek keaslian loker, lalu menyesuaikan CV dan lamaran per lowongan secara jujur, sampai siap interview**. **Berbeda dengan** chatbot AI umum atau template CV, ZJobsAgent **(1) memblokir proses jika loker palsu, (2) tidak pernah mengarang pengalaman, dan (3) menampilkan kerja tiap agen secara transparan dengan skor sebelum dan sesudah.**

| Pain | Gain yang dijanjikan |
|---|---|
| "Loker ini asli nggak?" | Status **AMAN / WASPADA / PALSU** + alasan + arahan lapor ke iasc.ojk.go.id |
| "Kenapa nggak dipanggil?" | Diagnosis akar masalah: profil vs lowongan |
| "CV-ku generik" | CV per lowongan dengan kata kunci ATS, tanpa mengarang |
| "Nggak tahu cara nulis ke HR" | Surat lamaran + pesan singkat ke HR (email/WA/LinkedIn) |
| "Takut interview" | 5 pertanyaan prediksi + kerangka jawaban (STAR) dari data pengguna sendiri |
| "Lamaran berantakan" | Tracker status + pengingat follow-up |

---

## 5. Prinsip Produk (non-negotiable)

1. **Jujur di atas segalanya.** Agen dilarang mengarang pengalaman, sertifikat, pencapaian, angka, atau nama perusahaan. Data yang kosong ditulis sebagai placeholder `[isi: ...]`.
2. **Aman dulu, baru optimasi.** Gerbang scam selalu berjalan sebelum agen CV.
3. **Transparan.** Setiap langkah agen terlihat (timeline estafet), termasuk apa yang dibaca dan diputuskan.
4. **Bahasa:** UI dan penjelasan memakai Bahasa Indonesia santai tapi profesional. CV dan surat lamaran **mengikuti bahasa lowongan** (ID/EN).
5. **Mobile-first, hemat kuota.** Halaman ringan, tanpa aset berat.
6. **Bukan keputusan otomatis.** Hasil AI adalah saran. Status AMAN tidak berarti jaminan, dan skor ATS adalah estimasi internal.

---

## 6. Ruang Lingkup Fitur

### 6.1 MVP (4–6 minggu, solo dev + AI coding)

| ID | Fitur | Deskripsi | Prioritas |
|---|---|---|---|
| F1 | **Cek Loker Palsu (tamu & user)** | Tempel teks atau link lowongan, lalu dapat AMAN/WASPADA/PALSU + alasan + bukti kutipan. Tamu tanpa login, dengan rate limit. | P0 |
| F2 | **Ambil isi link lowongan** | Server mengambil halaman publik (tanpa login/bypass). Jika gagal, pengguna diminta menempel teks. Domain/URL dipakai sebagai sinyal scam. | P0 |
| F3 | **Gerbang PALSU** | Alur berhenti, tampil tanda-tanda penipuan + tombol "Lapor ke IASC OJK" (iasc.ojk.go.id) + "Laporkan salah deteksi". | P0 |
| F4 | **Auth & Consent** | Email magic link / OTP email + Google. Consent UU PDP yang granular. | P0 |
| F5 | **Onboarding Profil** | Upload CV (PDF/DOCX), parse, lalu pengguna mengonfirmasi profil terstruktur. Bisa juga isi profil manual. | P0 |
| F6 | **Estafet Multi-Agent** | Lead Orchestrator → Agen 1 → Gerbang → Agen 2 → Agen 3, dengan timeline real-time. | P0 |
| F7 | **CV Tailor + Unduh** | CV per lowongan (template ATS satu kolom), unduh **PDF + DOCX**. | P0 |
| F8 | **Surat Lamaran & Pesan HR** | Surat lamaran + versi pesan singkat (email/WA/LinkedIn) + strategi lamaran. | P0 |
| F9 | **Review HR & Interview** | Skor ATS sebelum/sesudah (0–100), kritik HR, versi final, 5 pertanyaan interview + kerangka jawaban. | P0 |
| F10 | **Laporan Markdown** | Unduh "Multi-Agent Orchestration Report" (Konteks, Pembagian Tugas, Ringkasan Estafet, Hasil Akhir). | P0 |
| F11 | **Tracker Lite** | Daftar lamaran + ubah status (Disimpan → Dikirim → Dipanggil → Interview → Diterima/Ditolak). **Diperlukan untuk mengukur metrik utama.** | P0 |
| F12 | **Kuota & Paket** | Gratis (cek loker tanpa batas dengan *fair use*, 3 CV/bulan). Premium via payment gateway. | P1 (minggu 5) |
| F13 | **Privasi & Data** | Ekspor data, hapus CV, hapus akun, cabut consent. | P0 |
| F14 | **Landing & Pricing** | Landing page dengan data latar + halaman harga. | P1 |

### 6.2 Nanti (Fase 2–3)

| Fase | Fitur |
|---|---|
| Fase 2 | **Interview Coach Voice** (latihan suara + feedback), **Tracker penuh** (kanban, pengingat follow-up via email/push, ringkasan mingguan), **WhatsApp** (cek loker via chat WA, notifikasi), multi-template CV, riwayat versi CV, deteksi duplikat loker lintas pengguna, cek reputasi domain lanjutan |
| Fase 3 | **B2B Dashboard** kampus/SMK/BKK: dashboard penyerapan lulusan, lisensi massal, laporan agregat anonim, peringatan loker palsu yang menyasar alumni |
| Kemudian | Integrasi portal kerja resmi (jika ada API/kemitraan), ekstensi browser, aplikasi native |

### 6.3 Di luar cakupan (eksplisit)
- Melamar otomatis atas nama pengguna (auto-apply).
- Scraping portal yang membutuhkan login atau melanggar ketentuan layanan.
- Verifikasi legal perusahaan secara resmi. Sistem hanya memberi indikasi, bukan putusan hukum.

---

## 7. Model Bisnis

| Paket | Harga | Isi |
|---|---|---|
| **Gratis** | Rp0 | Cek loker palsu tanpa batas (*fair use*: lihat 07-security), **3 estafet CV/bulan**, tracker lite, laporan Markdown |
| **Premium** | **Rp29.000–49.000/bulan [ASUMSI]** | Kuota estafet lebih besar (angka final menunggu keputusan model AI, lihat 04 §9), prioritas antrean, (fase 2) interview voice, pengingat follow-up, ringkasan mingguan |
| **B2B** (Fase 3) | Per kursi/per institusi [ASUMSI] | Dashboard kampus/SMK/BKK |

> ⚠️ **Catatan unit economics:** Estimasi biaya token per estafet (04 §9) menunjukkan bahwa pilihan model AI sangat menentukan apakah harga Premium Rp29–49 ribu masih menguntungkan. Kuota Premium **belum** ditetapkan dan menjadi keputusan di README.

---

## 8. Metrik Sukses

### 8.1 North Star Metric
**Jumlah panggilan interview per pengguna aktif per 30 hari.**
- Definisi: jumlah lamaran milik pengguna yang statusnya berpindah ke **Dipanggil** atau **Interview** dalam 30 hari, dibagi jumlah pengguna yang menyelesaikan ≥1 estafet dalam periode yang sama.
- Sumber data: pembaruan status di Tracker (self-report). Fase 2 menambah prompt pengingat "Sudah ada kabar dari [perusahaan]?" untuk meningkatkan kelengkapan data.
- Target awal: **[ASUMSI]** ditetapkan setelah 4 minggu data baseline. Belum ada angka pembanding yang valid.

### 8.2 Metrik pendukung

| Kategori | Metrik | Definisi |
|---|---|---|
| Akuisisi | Cek loker / minggu | Jumlah `scam_checks` (tamu + user) |
| Aktivasi | % aktivasi | % pendaftar baru yang menyelesaikan 1 estafet penuh dalam 7 hari |
| Keamanan | Hasil PALSU → klik lapor | % hasil PALSU yang tombol lapornya diklik |
| Keamanan | Tingkat salah deteksi | % hasil yang dilaporkan "salah deteksi" dan terkonfirmasi setelah ditinjau |
| Kualitas | Δ skor ATS | Rata-rata (skor sesudah − skor sebelum) per estafet |
| Kualitas | **Pelanggaran fabrikasi** | Jumlah klaim tanpa sumber yang lolos ke output final. **Target: 0** |
| Kualitas | Kelengkapan tracker | % lamaran berumur >14 hari yang statusnya sudah diperbarui setelah "Dikirim" |
| Retensi | D30 retention | % pengguna yang kembali di hari 23–37 |
| Monetisasi | Konversi Gratis → Premium | % pengguna aktif bulanan yang berlangganan |
| Operasional | Biaya AI / estafet | Total biaya token per estafet (dicatat di `agent_runs`) |
| Operasional | Latensi p95 | Waktu dari submit hingga Agen 3 selesai |

---

## 9. Asumsi yang Perlu Divalidasi

| # | Asumsi | Cara validasi | Kapan |
|---|---|---|---|
| A1 | Pengguna bersedia upload CV ke layanan AI jika consent dan perlindungan datanya jelas | Wawancara + tingkat penyelesaian onboarding | Minggu 1–3 |
| A2 | CV per lowongan meningkatkan jumlah panggilan dibanding CV generik | Bandingkan status lamaran pengguna (tailored vs tidak), serta *cohort* sebelum/sesudah pakai | Pasca-MVP, 4–8 minggu |
| A3 | Deteksi loker palsu berbasis aturan + LLM cukup akurat tanpa database perusahaan resmi | Eval set berlabel (min. 100 contoh AMAN/WASPADA/PALSU) + laporan salah deteksi | Minggu 2–4 |
| A4 | Pengguna mau melaporkan status lamarannya secara jujur dan rutin (penting untuk North Star) | Kelengkapan tracker, uji prompt pengingat | Minggu 4+ |
| A5 | Bersedia membayar Rp29–49 ribu/bulan | Uji *fake door* / pre-order di halaman pricing, wawancara | Minggu 5–6 |
| A6 | Halaman publik portal kerja utama bisa diambil isinya (sebagian besar akan gagal untuk portal yang mewajibkan login) | Ukur tingkat keberhasilan fetch per domain | Minggu 1–2 |
| A7 | Skor ATS internal berkorelasi dengan peluang dipanggil | Korelasi skor vs status "Dipanggil" | Pasca-MVP |
| A8 | Timeline estafet transparan meningkatkan kepercayaan (bukan malah membingungkan) | Uji usability 5 pengguna | Minggu 3 |
| A9 | Latensi estafet penuh (±1–3 menit [ASUMSI]) dapat diterima jika progres terlihat | Usability + drop-off rate di workspace | Minggu 3 |

---

## 10. Risiko Utama

| Risiko | Mitigasi |
|---|---|
| Salah deteksi (loker asli ditandai PALSU) merugikan perusahaan dan pengguna | Bahasa hati-hati ("terindikasi"), bukti kutipan, tombol laporkan salah deteksi, eval set |
| Loker palsu lolos sebagai AMAN | Label "tidak ditemukan tanda penipuan", bukan "dijamin asli". Checklist verifikasi mandiri selalu tampil |
| AI mengarang isi CV | Validator anti-fabrikasi berbasis sumber (04 §6) + audit Agen 3 |
| Biaya AI melebihi pendapatan | Pemilihan model, cache hasil cek loker per hash konten, kuota, pemantauan biaya per run |
| Prompt injection dari teks lowongan/CV | Lihat 07 §6 |
| Kepatuhan UU PDP (transfer data lintas negara ke penyedia LLM) | Consent eksplisit, redaksi PII sebelum dikirim ke LLM, DPIA |
