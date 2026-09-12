"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createMcpToken,
  listMcpTokens,
  revokeMcpToken,
  type McpTokenSummary,
} from "@/lib/mcp-token-repository";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SettingsMcpTokens() {
  const { user, firebaseReady } = useAuth();
  const [tokens, setTokens] = useState<McpTokenSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firebaseReady) {
      setLoaded(false);
      setTokens([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = await listMcpTokens();
      if (!cancelled) {
        setTokens(rows);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, firebaseReady]);

  async function onGenerate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const token = await createMcpToken(label.trim() || "Claude");
      if (!token) {
        setError("Couldn’t generate a token. Try again.");
        return;
      }
      setNewToken(token);
      setLabel("");
      setTokens(await listMcpTokens());
    } catch {
      setError("Couldn’t generate a token. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const prev = tokens;
    setTokens(tokens.filter((t) => t.id !== id));
    try {
      const ok = await revokeMcpToken(id);
      if (!ok) {
        setTokens(prev);
        setError("Couldn’t revoke that token. Try again.");
      }
    } catch {
      setTokens(prev);
      setError("Couldn’t revoke that token. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onCopyNewToken() {
    if (!newToken) return;
    const ok = await copyText(newToken);
    if (!ok) {
      setError("Couldn’t copy the token.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!firebaseReady) return null;

  return (
    <section className="space-y-4" aria-labelledby="mcp-tokens-heading">
      <div className="space-y-2">
        <h2
          id="mcp-tokens-heading"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
        >
          Connect to Claude
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Generate a personal access token, then add Built Daily as a custom
          connector in Claude using this token as the API key. Claude can
          read your recent workouts and exercise catalog — nothing is
          written back.
        </p>
      </div>

      {!user ? (
        <p className="text-sm text-zinc-500">Sign in to manage tokens.</p>
      ) : !loaded ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          {newToken ? (
            <div className="space-y-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Copy this token now — you won’t be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-zinc-100 px-2 py-1.5 text-xs dark:bg-zinc-900">
                  {newToken}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onCopyNewToken()}
                >
                  {copied ? (
                    <>
                      <Check />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewToken(null)}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (e.g. Claude Desktop)"
                maxLength={80}
                disabled={busy}
                className="max-w-xs"
              />
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void onGenerate()}
              >
                Generate token
              </Button>
            </div>
          )}

          {tokens.length > 0 ? (
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {tokens.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {t.label || "Untitled token"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Created {formatDate(t.createdAt)} · Last used{" "}
                      {formatDate(t.lastUsedAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onRevoke(t.id)}
                    aria-label={`Revoke token ${t.label || t.id}`}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No tokens yet.</p>
          )}
        </>
      )}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
