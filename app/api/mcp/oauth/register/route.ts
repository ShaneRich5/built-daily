import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { oauthCorsPreflight, oauthJson } from "@/mcp/oauth-http";
import { registerOAuthClient } from "@/mcp/oauth-clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dynamic Client Registration (RFC 7591). ChatGPT calls this unauthenticated
 * the first time it connects, to introduce itself and get a `client_id`.
 * Registration alone grants no access: a registered client still has to send
 * a user through the consent screen before it holds a token.
 *
 * See docs/MCP_CHATGPT_OAUTH.md.
 */
export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return oauthJson(
      { error: "server_error", error_description: "Server is not configured" },
      { status: 503 },
    );
  }

  let body: { redirect_uris?: unknown; client_name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return oauthJson(
      {
        error: "invalid_client_metadata",
        error_description: "Body must be JSON",
      },
      { status: 400 },
    );
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((uri): uri is string => typeof uri === "string")
    : [];
  const clientName =
    typeof body.client_name === "string" ? body.client_name : "";

  let result;
  try {
    result = await registerOAuthClient(clientName, redirectUris);
  } catch (err) {
    // Firestore/credentials failure — never surface internals to an
    // unauthenticated caller; log it instead.
    console.error("OAuth client registration failed:", err);
    return oauthJson(
      { error: "server_error", error_description: "Registration failed" },
      { status: 500 },
    );
  }

  if (!result.ok) {
    return oauthJson(
      { error: "invalid_redirect_uri", error_description: result.error },
      { status: 400 },
    );
  }

  const { client } = result;
  return oauthJson(
    {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201 },
  );
}

export function OPTIONS() {
  return oauthCorsPreflight();
}
