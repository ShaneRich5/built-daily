"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { copyText } from "@/lib/copy-text";

/** Small all-caps label above a card, as on Progress. */
export function SettingsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {title}
      </h2>
      <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {children}
      </div>
    </section>
  );
}

/** A quiet bordered button sized for thumbs (40px tall). */
export const secondaryButton =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900";

/** The page's one dark, filled action per card. */
export const primaryButton =
  "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

/**
 * A value to paste somewhere else (a link, a URL, a token) with its own Copy button.
 * `wrap` shows the whole value instead of truncating it, for tokens you must see in full.
 */
export function CopyField({ label, value, wrap = false }: { label: string; value: string; wrap?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function onCopy() {
    const ok = await copyText(value);
    setState(ok ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <code
          className={`min-w-0 flex-1 rounded-lg bg-zinc-100 px-2.5 py-2 font-mono text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 ${wrap ? "break-all" : "truncate"}`}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={() => void onCopy()}
          aria-label={`Copy ${label.toLowerCase()}`}
          className={secondaryButton}
        >
          {state === "copied" ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {state === "copied" ? "Copied" : state === "failed" ? "Try again" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-[13px] text-red-600 dark:text-red-400" role="alert">
      {message}
    </p>
  );
}
