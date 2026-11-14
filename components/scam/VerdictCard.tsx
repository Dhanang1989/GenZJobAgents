import { AlertTriangle, CircleCheck, OctagonX } from "lucide-react";
import type { PublicScamCheck } from "@/lib/scam/publicView";
import { cn } from "@/lib/utils";

const STYLE = {
  AMAN: { box: "border-emerald-300 bg-emerald-50 text-emerald-950", icon: CircleCheck, iconCls: "text-emerald-600", title: "Tidak ditemukan tanda penipuan", sub: "Status: AMAN. Tetap cek sendiri sebelum mengirim data." },
  WASPADA: { box: "border-amber-300 bg-amber-50 text-amber-950", icon: AlertTriangle, iconCls: "text-amber-600", title: "WASPADA", sub: "Ada hal yang perlu kamu cek dulu sebelum melamar." },
  PALSU: { box: "border-red-300 bg-red-50 text-red-950", icon: OctagonX, iconCls: "text-red-600", title: "TERINDIKASI PALSU", sub: "Proses dihentikan demi keamananmu. Jangan lanjutkan lamaran ini." },
} as const;

export function VerdictCard({ view }: { view: PublicScamCheck }) {
  const s = STYLE[view.verdict];
  const Icon = s.icon;
  return (
    <div className={cn("rounded-2xl border-2 p-4", s.box)} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon aria-hidden className={cn("mt-0.5 size-8 shrink-0", s.iconCls)} />
        <div className="min-w-0">
          <p className="text-xl font-extrabold leading-tight">{s.title}</p>
          <p className="mt-1 text-sm">{s.sub}</p>
          <p className="mt-2 text-sm font-semibold">Skor risiko: {view.risk_score}/100</p>
          <p className="mt-1 truncate text-sm">
            “{view.job.title}”{view.job.company_claimed ? ` · ${view.job.company_claimed}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
