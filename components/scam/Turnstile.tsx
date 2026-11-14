"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; language?: string; size?: string }) => string;
  reset: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Captcha tak terlihat untuk tamu. Tidak dirender jika NEXT_PUBLIC_TURNSTILE_SITE_KEY kosong (dev). */
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  function renderWidget() {
    if (!siteKey || rendered.current || !ref.current || !window.turnstile) return;
    rendered.current = true;
    window.turnstile.render(ref.current, {
      sitekey: siteKey,
      callback: (t) => onToken(t),
      "expired-callback": () => onToken(null),
      language: "id",
      size: "flexible",
    });
  }

  useEffect(renderWidget);

  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderWidget} />
      <div ref={ref} className="min-h-[65px]" />
    </>
  );
}
