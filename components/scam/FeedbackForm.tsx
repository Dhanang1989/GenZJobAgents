"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** "Laporkan salah deteksi" — masuk antrean tinjauan manual; hasil tidak berubah otomatis. */
export function FeedbackForm({ shareToken, verdict }: { shareToken: string; verdict: "AMAN" | "WASPADA" | "PALSU" }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const claim = verdict === "AMAN" ? "false_negative" : "false_positive";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const evidence = new FormData(e.currentTarget).get("evidence")?.toString() ?? "";
    setState("sending");
    const res = await fetch(`/api/public/scam-checks/${shareToken}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ claim, evidence_text: evidence }),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      return;
    }
    const data = await res?.json().catch(() => null);
    setMessage(data?.error?.message ?? "Gagal mengirim. Coba lagi.");
    setState("error");
  }

  if (state === "sent") {
    return <p className="rounded-xl bg-slate-100 p-3 text-sm">Terima kasih! Laporanmu akan ditinjau tim kami. Hasil di halaman ini belum berubah sampai tinjauan selesai.</p>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm font-semibold text-indigo-700 underline underline-offset-4">
        {verdict === "AMAN" ? "Menurutmu ini sebenarnya penipuan?" : "Menurutmu ini salah deteksi?"}
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <label htmlFor="evidence" className="block text-sm font-semibold">
        {verdict === "AMAN" ? "Ceritakan kenapa kamu curiga (mis. diminta transfer setelah chat)" : "Bukti bahwa loker ini asli (mis. link situs karier resmi perusahaan)"}
      </label>
      <textarea id="evidence" name="evidence" required minLength={10} maxLength={2000} rows={3} className="w-full rounded-lg border border-slate-300 p-2 text-base" />
      {state === "error" ? <p className="text-sm text-red-700">{message}</p> : null}
      <Button type="submit" variant="outline" disabled={state === "sending"}>
        {state === "sending" ? "Mengirim…" : "Kirim untuk ditinjau"}
      </Button>
    </form>
  );
}
