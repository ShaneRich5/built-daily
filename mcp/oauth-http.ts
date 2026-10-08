/**
 * Response helpers shared by the OAuth endpoints (discovery documents, DCR,
 * token exchange). All of them are read or called cross-origin by MCP clients,
 * so every response carries permissive CORS — same posture as /api/mcp itself.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, MCP-Protocol-Version",
};

export function oauthJson(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return Response.json(body, { ...init, headers });
}

export function oauthCorsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
