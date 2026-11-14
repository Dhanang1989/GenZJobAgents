import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privasi (draf)" };

// DRAF — wajib ditinjau konsultan hukum (UU PDP & PP 33/2026) sebelum launch publik (blueprint K15).
export default function PrivasiPage() {
  return (
    <article className="space-y-4 text-sm leading-relaxed">
      <h1 className="text-2xl font-extrabold">Privasi: Cek Loker Palsu</h1>
      <p className="rounded-xl bg-amber-50 p-3 text-amber-950">Draf versi beta. Kebijakan privasi lengkap akan terbit sebelum peluncuran publik.</p>
      <h2 className="text-lg font-bold">Data yang kami proses</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Teks atau link lowongan</b> yang kamu tempel, untuk dinilai risikonya.</li>
        <li><b>Penanda perangkat acak</b> (cookie) dan alamat IP yang disamarkan dan di-hash, hanya untuk membatasi penyalahgunaan. Penanda ini berganti setiap hari dan tidak dipakai untuk mengenali dirimu.</li>
      </ul>
      <h2 className="text-lg font-bold">Pemrosesan oleh AI</h2>
      <p>Teks lowongan dianalisis oleh penyedia model AI (Anthropic, Amerika Serikat) agar kami bisa menjelaskan tanda-tanda penipuannya. Jangan menempel data pribadimu sendiri (NIK, nomor rekening, dsb.) ke kolom cek loker.</p>
      <h2 className="text-lg font-bold">Halaman hasil</h2>
      <p>Hasil cek bisa dibagikan lewat link. Kontak (nomor HP/email) di dalamnya kami samarkan, dan halaman hasil tidak diindeks mesin pencari.</p>
      <h2 className="text-lg font-bold">Penyimpanan</h2>
      <p>Hasil cek dari pengguna tanpa akun disimpan maksimal 30 hari, lalu dihapus otomatis.</p>
    </article>
  );
}
