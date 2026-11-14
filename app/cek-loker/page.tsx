import type { Metadata } from "next";
import { CekLokerForm } from "@/components/scam/CekLokerForm";

export const metadata: Metadata = {
  title: "Cek Loker Palsu",
  description: "Tempel teks atau link lowongan, lalu dapatkan status AMAN / WASPADA / PALSU lengkap dengan alasan dan bukti.",
};

export default function CekLokerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Cek Loker Palsu</h1>
        <p className="mt-1 text-slate-700">Tempel teks lowongan atau link-nya. Gratis, tanpa daftar.</p>
      </div>
      <CekLokerForm />
    </div>
  );
}
