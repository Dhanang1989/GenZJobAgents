import { Check, Flag } from "lucide-react";
import type { PublicScamCheck } from "@/lib/scam/publicView";

export function RedFlagList({ flags, heading }: { flags: PublicScamCheck["red_flags"]; heading: string }) {
  if (flags.length === 0) return null;
  return (
    <section aria-labelledby="red-flags">
      <h2 id="red-flags" className="flex items-center gap-2 text-lg font-bold">
        <Flag aria-hidden className="size-5 text-red-600" /> {heading}
      </h2>
      <ol className="mt-2 space-y-2">
        {flags.map((f, i) => (
          <li key={i}>
            <details className="group rounded-xl border border-slate-200 bg-white p-3" open={i < 3}>
              <summary className="cursor-pointer list-none font-semibold">
                <span className="mr-1 text-slate-500">{i + 1}.</span>
                {f.title}
                {f.severity === "hard" ? <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">serius</span> : null}
              </summary>
              <p className="mt-2 text-sm text-slate-700">{f.explanation}</p>
              {f.evidence ? (
                <blockquote className="mt-2 border-l-4 border-slate-300 pl-3 text-sm italic text-slate-600">“{f.evidence}”</blockquote>
              ) : null}
              <p className="mt-1 text-xs text-slate-400">Sumber: {f.source === "ai" ? "analisis AI" : "pemeriksa pola otomatis"}</p>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function GreenFlagList({ flags }: { flags: PublicScamCheck["green_flags"] }) {
  if (flags.length === 0) return null;
  return (
    <section aria-labelledby="green-flags">
      <h2 id="green-flags" className="text-lg font-bold">Yang terlihat wajar</h2>
      <ul className="mt-2 space-y-1">
        {flags.map((f, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>{f.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
