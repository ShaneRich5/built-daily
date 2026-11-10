"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  createMcpToken,
  listMcpTokens,
  revokeMcpToken,
  type McpTokenSummary,
} from "@/lib/mcp-token-repository";

/** The signed-in user's Claude connector tokens: list, generate (shown once), revoke. */
export function useMcpTokens() {
  const { user, firebaseReady } = useAuth();
  const [tokens, setTokens] = useState<McpTokenSummary[]>([]);
  /** Whose tokens `tokens` holds, so a different (or no) user reads as not loaded. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firebaseReady) return;
    const uid = user.uid;
    let cancelled = false;
    void (async () => {
      const rows = await listMcpTokens();
      if (cancelled) return;
      setTokens(rows);
      setLoadedFor(uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, firebaseReady]);

  async function generate(label: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const token = await createMcpToken(label);
      if (!token) throw new Error("not created");
      setNewToken(token);
      setTokens(await listMcpTokens());
    } catch {
      setError("Couldn’t generate a token. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const prev = tokens;
    setTokens(tokens.filter((t) => t.id !== id));
    try {
      if (!(await revokeMcpToken(id))) throw new Error("not revoked");
    } catch {
      setTokens(prev);
      setError("Couldn’t revoke that token. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const loaded = Boolean(user) && loadedFor === user?.uid;
  const serverUrl = typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp";

  return {
    loaded,
    tokens: loaded ? tokens : [],
    busy,
    error,
    newToken,
    serverUrl,
    generate,
    revoke,
    dismissNewToken: () => setNewToken(null),
  };
}
