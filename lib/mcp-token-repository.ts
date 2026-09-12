import { getFirebaseAuth } from "@/lib/firebase";

export type McpTokenSummary = {
  id: string;
  label: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
};

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error("Not signed in");
  const idToken = await user.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${idToken}`);
  return fetch(path, { ...init, headers });
}

/** Lists the signed-in user's MCP access tokens (metadata only). */
export async function listMcpTokens(): Promise<McpTokenSummary[]> {
  const res = await authedFetch("/api/mcp/tokens");
  if (!res.ok) return [];
  const data = (await res.json()) as { tokens?: McpTokenSummary[] };
  return Array.isArray(data.tokens) ? data.tokens : [];
}

/** Generates a new token for the signed-in user. Returns the raw token, shown once. */
export async function createMcpToken(label: string): Promise<string | null> {
  const res = await authedFetch("/api/mcp/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { token?: string };
  return typeof data.token === "string" ? data.token : null;
}

/** Revokes one of the signed-in user's tokens. */
export async function revokeMcpToken(id: string): Promise<boolean> {
  const res = await authedFetch(
    `/api/mcp/tokens?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return res.ok;
}
