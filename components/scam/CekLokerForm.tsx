"use client";

import { Check, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Turnstile } from "@/components/scam/Turnstile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_CHARS = 8_000;
const STEPS = ["Membaca teks lowongan", "Cek pola biaya & data sensitif", "Menilai kewajaran gaji & kontak", "Menyusun alasan & bukti"];

type Mode = "teks" | "link";
type ApiError = { error?: { code?: string; message?: string } };

export function CekLokerForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("teks");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [contact, setContact] = useState<string>("");
  const [askedToPay, setAskedToPay] = useState<"" | "ya" | "tidak">("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500);
    return () => clearInterval(id);
  }, [busy]);

  const needsCaptcha = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const canSubmit = !busy && (mode === "link" ? url.trim().length > 3 || text.trim().length > 0 : text.trim().length > 0) && (!needsCaptcha || token);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    setStep(0);
    try {
      const ingest = await fetch("/api/job-posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: mode === "link" || url ? url || null : null,
          text: text || null,
          recruiter_contact_type: contact || null,
          asked_to_pay: askedToPay === "" ? null : askedToPay === "ya",
        }),
      });
      const ingestData = (await ingest.json()) as ApiError & { job_post_id?: string };
      if (!ingest.ok || !ingestData.job_post_id) {
        if (ingestData.error?.code === "needs_text") {
          // Fallback: minta pengguna menempel teks; URL tetap dikirim sebagai sinyal.
          setMode("teks");
          setNotice(ingestData.error.message ?? null);
        } else {
          setError(ingestData.error?.message ?? "Gagal membaca lowongan.");
        }
        return;
      }

      const check = await fetch("/api/scam-checks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ job_post_id: ingestData.job_post_id, turnstile_token: token }),
      });
      const checkData = (await check.json()) as ApiError & { scam_check?: { share_token: string } };
      if (!check.ok || !checkData.scam_check) {
        setError(checkData.error?.message ?? "Gagal memeriksa lowongan.");
        return;
      }
      router.push(`/cek-loker/${checkData.scam_check.share_token}`);
    } catch {
      setError("Koneksi bermasalah. Periksa internetmu lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4" role="status" aria-live="polite">
        <p className="font-bold">Agen 1 sedang memeriksa…</p>
        <ul className="mt-3 space-y-2">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2 text-sm", i > step && "text-slate-400")}>
              {i < step ? <Check className="size-4 text-emerald-600" aria-hidden /> : i === step ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <span className="inline-block size-4" />}
              {s}
            </li>
          ))}
        </ul>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${((step + 1) / STEPS.length) * 90}%` }} />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div role="radiogroup" aria-label="Jenis input" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {(["teks", "link"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={cn("min-h-11 rounded-lg text-sm font-semibold", mode === m ? "bg-white shadow-sm" : "text-slate-600")}
          >
            {m === "teks" ? "Tempel teks" : "Tempel link"}
          </button>
        ))}
      </div>

      {notice ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{notice}</p> : null}

      {mode === "link" ? (
        <div>
          <label htmlFor="url" className="block text-sm font-semibold">Link lowongan</label>
          <input
            id="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-base"
          />
          <p className="mt-1 text-xs text-slate-500">Kami hanya membuka halaman publik, tanpa login.</p>
        </div>
      ) : (
        <div>
          <label htmlFor="text" className="block text-sm font-semibold">Teks lowongan</label>
          <textarea
            id="text"
            rows={8}
            maxLength={MAX_CHARS}
            placeholder="Tempel teks lowongan dari WA, IG, Telegram, atau portal kerja…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-base"
          />
          <p className="mt-1 text-right text-xs text-slate-500">
            {text.length.toLocaleString("id-ID")} / {MAX_CHARS.toLocaleString("id-ID")} karakter
          </p>
          {url ? <p className="text-xs text-slate-500">Link {url} tetap kami pakai sebagai petunjuk.</p> : null}
        </div>
      )}

      <details className="rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold">Info tambahan (opsional, bikin hasil lebih akurat)</summary>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="contact" className="block text-sm">Perekrut menghubungimu lewat?</label>
            <select id="contact" value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-base">
              <option value="">Tidak tahu / belum dihubungi</option>
              <option value="wa">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="email_gratis">Email gmail/yahoo dsb.</option>
              <option value="email_domain">Email domain perusahaan</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <fieldset>
            <legend className="text-sm">Kamu diminta bayar sesuatu?</legend>
            <div className="mt-1 flex gap-4">
              {(["ya", "tidak"] as const).map((v) => (
                <label key={v} className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="radio" name="pay" checked={askedToPay === v} onChange={() => setAskedToPay(v)} className="size-5 accent-indigo-600" />
                  {v === "ya" ? "Ya" : "Tidak"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>

      <Turnstile onToken={setToken} />

      <p className="text-xs text-slate-500">
        🔒 Teks lowongan tidak dikaitkan ke identitasmu. Jangan tempel data pribadimu sendiri. <a href="/privasi" className="underline">Privasi</a>
      </p>

      {error ? <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">{error}</p> : null}

      <Button type="submit" size="full" className="sticky bottom-3" disabled={!canSubmit}>
        <Search aria-hidden className="size-5" /> Cek Sekarang
      </Button>
    </form>
  );
}
