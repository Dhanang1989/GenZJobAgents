"use client";

import { ClipboardCopy, Megaphone, Share2 } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tombol aksi layar Gerbang PALSU (blueprint 03 W3b). */
export function PalsuActions({ iascUrl, evidence, shareUrl }: { iascUrl: string; evidence: string; shareUrl: string }) {
  const [copied, setCopied] = useState<"evidence" | "share" | null>(null);

  async function copy(text: string, which: "evidence" | "share") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      window.prompt("Salin teks berikut:", text);
    }
  }

  async function share() {
    const data = { title: "Hati-hati loker palsu", text: "Loker ini terindikasi palsu menurut ZJobsAgent. Cek alasannya:", url: shareUrl };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* dibatalkan pengguna */
      }
    }
    await copy(shareUrl, "share");
  }

  return (
    <div className="space-y-2">
      <a href={iascUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "danger", size: "full" }))}>
        <Megaphone aria-hidden className="size-5" /> Lapor ke IASC OJK ↗
      </a>
      <Button variant="outline" size="full" onClick={() => copy(evidence, "evidence")}>
        <ClipboardCopy aria-hidden className="size-5" /> {copied === "evidence" ? "Ringkasan bukti tersalin ✓" : "Salin ringkasan bukti"}
      </Button>
      <Button variant="outline" size="full" onClick={share}>
        <Share2 aria-hidden className="size-5" /> {copied === "share" ? "Link tersalin ✓" : "Bagikan peringatan ke teman"}
      </Button>
    </div>
  );
}

/** Checklist verifikasi mandiri (tidak disimpan; hanya alat bantu). */
export function VerifyChecklist({ items, defaultOpen }: { items: string[]; defaultOpen: boolean }) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-3" open={defaultOpen}>
      <summary className="cursor-pointer font-semibold">Cek sendiri sebelum lanjut</summary>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item}>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="size-5 accent-indigo-600" /> {item}
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}
