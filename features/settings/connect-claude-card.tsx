"use client";

import { KeyRound, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { McpTokenSummary } from "@/lib/mcp-token-repository";
import {
  CopyField,
  ErrorLine,
  SettingsSection,
  primaryButton,
  secondaryButton,
} from "@/features/settings/settings-ui";

export type ConnectClaudeCardProps = {
  loaded: boolean;
  tokens: McpTokenSummary[];
  busy: boolean;
  error: string | null;
  /** The address Claude's custom connector points at. */
  serverUrl: string;
  /** A token that was just made: shown once, then gone. */
  newToken: string | null;
  onGenerate: (label: string) => void;
  onRevoke: (id: string) => void;
  onDismissNewToken: () => void;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function tokenMeta(t: McpTokenSummary): string {
  const created = formatDate(t.createdAt);
  const used = formatDate(t.lastUsedAt);
  return [created ? `Created ${created}` : null, used ? `Last used ${used}` : "Never used"]
    .filter(Boolean)
    .join(" · ");
}

/** Three steps to use Built Daily from Claude, then the tokens you've made. */
export function ConnectClaudeCard(props: ConnectClaudeCardProps) {
  const [label, setLabel] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    props.onGenerate(label.trim() || "Claude");
    setLabel("");
  }

  return (
    <SettingsSection id="connect-heading" title="Connect to Claude">
      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
          Ask Claude about your training. It can look up your workouts and exercise history, and log or edit
          workouts when you ask. It can’t delete anything.
        </p>

        <ol className="flex flex-col gap-4">
          <Step n={1} title="Make a token">
            {props.newToken ? (
              <div className="flex flex-col gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                <p className="text-[13px] font-medium text-amber-900 dark:text-amber-200">
                  Copy it now. You won’t see this token again.
                </p>
                <CopyField label="Token" value={props.newToken} wrap />
                <button type="button" onClick={props.onDismissNewToken} className={`${secondaryButton} self-start`}>
                  I’ve copied it
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="token-label" className="sr-only">
                  Token name
                </label>
                <input
                  id="token-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Name it, e.g. Claude on my phone"
                  maxLength={80}
                  disabled={!props.loaded || props.busy}
                  className="h-11 w-full min-w-0 rounded-[10px] sm:flex-1 border border-zinc-200 bg-white px-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:border-zinc-100"
                />
                <button type="submit" disabled={!props.loaded || props.busy} className={primaryButton}>
                  <KeyRound className="size-4" aria-hidden />
                  Generate token
                </button>
              </form>
            )}
          </Step>
          <Step n={2} title="Add Built Daily as a custom connector in Claude">
            <CopyField label="Connector URL" value={props.serverUrl} />
          </Step>
          <Step n={3} title="Paste the token as the connector’s API key" />
        </ol>

        <ErrorLine message={props.error} />
      </div>

      <div className="border-t border-zinc-100 px-4 pt-3 pb-1 dark:border-zinc-800">
        <h3 className="text-[13px] font-medium text-zinc-900 dark:text-zinc-50">Your tokens</h3>
        {!props.loaded ? (
          <p className="py-3 text-[13px] text-zinc-500">Loading…</p>
        ) : props.tokens.length === 0 ? (
          <p className="py-3 text-[13px] text-zinc-500">None yet. Tokens you make show up here.</p>
        ) : (
          <ul className="flex flex-col">
            {props.tokens.map((t) => {
              const name = t.label || "Untitled token";
              return (
                <li
                  key={t.id}
                  className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-t border-zinc-100 py-2.5 first:border-t-0 dark:border-zinc-800"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
                    <span className="block text-xs text-zinc-500">{tokenMeta(t)}</span>
                  </span>
                  {confirmingId === t.id ? (
                    <span className="flex items-center gap-2">
                      <button type="button" onClick={() => setConfirmingId(null)} className={secondaryButton}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={props.busy}
                        onClick={() => {
                          setConfirmingId(null);
                          props.onRevoke(t.id);
                        }}
                        className="inline-flex h-10 items-center rounded-[10px] bg-red-600 px-3 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={props.busy}
                      onClick={() => setConfirmingId(t.id)}
                      aria-label={`Revoke ${name}`}
                      className="inline-flex size-10 items-center justify-center rounded-[10px] text-zinc-500 hover:bg-zinc-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-zinc-900"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SettingsSection>
  );
}

function Step({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <span className="pt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</span>
        {children}
      </div>
    </li>
  );
}
