import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Info, ShieldAlert } from "lucide-react";
import { FeedbackForm } from "@/components/scam/FeedbackForm";
import { GreenFlagList, RedFlagList } from "@/components/scam/FlagList";
import { PalsuActions, VerifyChecklist } from "@/components/scam/ResultActions";
import { VerdictCard } from "@/components/scam/VerdictCard";
import { buttonVariants } from "@/components/ui/button";
import { evidenceSummary, IASC_OJK_URL, toPublicView, VERIFY_CHECKLIST } from "@/lib/scam/publicView";
import { getStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// Halaman hasil bisa dibagikan, tapi tidak diindeks mesin pencari (menghindari tuduhan publik ke nama perusahaan).
export const metadata: Metadata = { title: "Hasil Cek Loker", robots: { index: false, follow: false } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function HasilCekPage(props: PageProps<"/cek-loker/[checkId]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">Memuat hasil…</p>}>
      <Result params={props.params} />
    </Suspense>
  );
}

async function Result({ params }: { params: PageProps<"/cek-loker/[checkId]">["params"] }) {
  const { checkId } = await params;
  if (!UUID_RE.test(checkId)) notFound();
  const store = getStore();
  const check = await store.getScamCheckByShareToken(checkId);
  if (!check) notFound();
  const view = toPublicView(check, await store.getJobPost(check.job_post_id));

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${proto}://${host}/cek-loker/${view.share_token}`;

  const isPalsu = view.verdict === "PALSU";

  return (
    <div className="space-y-5">
      <VerdictCard view={view} />

      {view.degraded ? (
        <p className="flex gap-2 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          Analisis AI sedang tidak tersedia, jadi hasil ini hanya dari pemeriksa pola otomatis. Karena itu status AMAN tidak bisa diberikan. Coba cek lagi nanti untuk analisis lengkap.
        </p>
      ) : null}
      {view.truncated ? <p className="text-sm text-slate-600">Catatan: halamannya panjang, jadi kami hanya membaca 12.000 karakter pertama.</p> : null}

      <RedFlagList flags={view.red_flags} heading={isPalsu ? "Tanda penipuan yang ditemukan" : "Kenapa perlu waspada?"} />
      {!isPalsu ? <GreenFlagList flags={view.green_flags} /> : null}

      {isPalsu ? (
        <section className="rounded-2xl border border-red-200 bg-white p-4" aria-labelledby="lakukan">
          <h2 id="lakukan" className="flex items-center gap-2 text-lg font-bold">
            <ShieldAlert aria-hidden className="size-5 text-red-600" /> Lakukan sekarang
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Jangan transfer uang apa pun</li>
            <li>Jangan kirim KTP, KK, OTP, atau PIN</li>
            <li>Simpan bukti chat, lalu blokir kontaknya</li>
          </ul>
          <details className="mt-3 rounded-xl bg-red-50 p-3 text-sm">
            <summary className="cursor-pointer font-semibold">Sudah terlanjur transfer atau kirim data?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Segera hubungi call center resmi bank/e-wallet-mu untuk minta pemblokiran.</li>
              <li>Ganti password dan PIN akun yang mungkin terkait.</li>
              <li>Simpan semua bukti: chat, bukti transfer, nomor rekening tujuan.</li>
              <li>Laporkan ke IASC OJK lewat tombol di bawah.</li>
            </ul>
          </details>
        </section>
      ) : (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Tips untuk loker ini</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {view.safety_tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {view.cannot_verify.length ? (
        <section>
          <h2 className="text-lg font-bold">Belum bisa kami pastikan</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {view.cannot_verify.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <VerifyChecklist items={VERIFY_CHECKLIST} defaultOpen={view.verdict === "WASPADA"} />

      <p className="flex gap-2 text-xs text-slate-500">
        <Info aria-hidden className="size-4 shrink-0" />
        Ini indikasi berbasis AI dan pola otomatis, bukan putusan hukum. Status AMAN berarti tidak ditemukan tanda penipuan, bukan jaminan.
      </p>

      {isPalsu ? (
        <PalsuActions iascUrl={IASC_OJK_URL} evidence={evidenceSummary(view)} shareUrl={shareUrl} />
      ) : (
        <div className="space-y-2">
          <button type="button" disabled className={cn(buttonVariants({ size: "full" }))} aria-describedby="cv-soon">
            ✍️ Sesuaikan CV untuk loker ini
          </button>
          <p id="cv-soon" className="text-center text-xs text-slate-500">Fitur CV sedang disiapkan (segera hadir).</p>
        </div>
      )}

      <FeedbackForm shareToken={view.share_token} verdict={view.verdict} />

      <Link href="/cek-loker" className={cn(buttonVariants({ variant: "outline", size: "full" }))}>
        Cek loker lain
      </Link>
    </div>
  );
}
