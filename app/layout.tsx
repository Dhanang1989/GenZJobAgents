import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ZJobsAgent: Cek loker palsu & CV yang dilirik HR", template: "%s · ZJobsAgent" },
  description: "Tim AI yang mengecek keaslian lowongan kerja, menyesuaikan CV per lowongan tanpa mengarang, dan melatihmu untuk interview.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4f46e5" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
            <Link href="/" className="text-lg font-extrabold tracking-tight text-indigo-700">
              ZJobsAgent
            </Link>
            <Link href="/cek-loker" className="text-sm font-semibold text-indigo-700">
              Cek Loker
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-xl flex-wrap gap-x-4 gap-y-1 px-4 py-4 text-sm text-slate-500">
            <Link href="/privasi">Privasi</Link>
            <span>Hasil AI bersifat saran, bukan putusan hukum.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
