import Link from "next/link";
import { ShieldCheck, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Data latar dari pemilik produk (blueprint 01 §2.1). Jangan tambah statistik tanpa sumber.
const STATS = [
  { value: "17,37%", label: "pengangguran usia 15–24 tahun", source: "BPS, Mei 2026" },
  { value: "29.373", label: "laporan penipuan kerja ke IASC OJK", source: "per Agustus 2026" },
  { value: "29,4%", label: "Gen Z sudah memakai AI (nasional 18,2%)", source: "APJII 2026" },
];

const RELAY = [
  { n: "①", title: "Peneliti Karier & Analis Scam", note: "Cek keaslian loker + kenapa kamu belum dipanggil" },
  { n: "🚧", title: "Gerbang keamanan", note: "Loker palsu? Proses berhenti, kamu diarahkan melapor" },
  { n: "②", title: "Arsitek CV & Lamaran", note: "CV per lowongan, tanpa mengarang pengalaman" },
  { n: "③", title: "Reviewer HR & Pelatih Interview", note: "Skor sebelum/sesudah + 5 pertanyaan interview" },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-extrabold leading-tight">
          Lebih sering dipanggil interview.
          <br />
          Bebas loker palsu.
        </h1>
        <p className="text-slate-700">
          Tim AI yang cek keaslian loker, sesuaikan CV-mu per lowongan, dan latih kamu buat interview. Tanpa mengarang pengalaman.
        </p>
        <Link href="/cek-loker" className={cn(buttonVariants({ size: "full" }), "min-h-12")}>
          <Search aria-hidden className="size-5" /> Cek Loker Gratis, tanpa daftar
        </Link>
        <p className="text-center text-sm text-slate-500">Bikin CV per lowongan: segera hadir.</p>
      </section>

      <section aria-labelledby="kenapa">
        <h2 id="kenapa" className="text-lg font-bold">Kenapa ini penting</h2>
        <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {STATS.map((s) => (
            <li key={s.value} className="min-w-[10.5rem] snap-start rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-2xl font-extrabold text-indigo-700">{s.value}</p>
              <p className="mt-1 text-sm">{s.label}</p>
              <p className="mt-1 text-xs text-slate-500">{s.source}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cara">
        <h2 id="cara" className="text-lg font-bold">Cara kerja: estafet 3 agen</h2>
        <ol className="mt-3 space-y-2">
          {RELAY.map((r) => (
            <li key={r.title} className="flex gap-3 rounded-xl bg-white p-3">
              <span className="text-xl" aria-hidden>{r.n}</span>
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-slate-600">{r.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl bg-indigo-50 p-4">
        <h2 className="flex items-center gap-2 font-bold"><ShieldCheck aria-hidden className="size-5 text-indigo-700" /> Janji kami</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>✓ Nggak ngarang pengalaman. Data kosong ditandai [isi: …]</li>
          <li>✓ Loker palsu? Kami hentikan prosesnya</li>
          <li>✓ Datamu bisa kamu hapus kapan saja</li>
        </ul>
      </section>
    </div>
  );
}
