import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { createAuthCode } from "@/mcp/oauth-codes";
import { getOAuthClient } from "@/mcp/oauth-clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Approve/deny action behind the consent screen (app/connect/authorize).
 * Called by the signed-in browser with a Firebase ID token; mints the
 * authorization code the client will exchange at /api/mcp/oauth/token.
 *
 * Every parameter is re-validated here rather than trusted from the page —
 * in particular `redirect_uri`, which is only ever echoed back after matching
 * a URI the client registered, so this can't be used as an open redirect.
 *
 * See docs/MCP_CHATGPT_OAUTH.md.
 */
async function requireUid(request: Request): Promise<string | Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json(
      { error: "Firebase Admin credentials are not configured" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!idToken) {
    return Response.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return Response.json({ error: "Invalid or expired session" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const uid = await requireUid(request);
  if (uid instanceof Response) return uid;

  let body: {
    client_id?: unknown;
    redirect_uri?: unknown;
    code_challenge?: unknown;
    code_challenge_method?: unknown;
    state?: unknown;
    approve?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const clientId = typeof body.client_id === "string" ? body.client_id : "";
  const redirectUri =
    typeof body.redirect_uri === "string" ? body.redirect_uri : "";
  const codeChallenge =
    typeof body.code_challenge === "string" ? body.code_challenge : "";
  const codeChallengeMethod =
    typeof body.code_challenge_method === "string"
      ? body.code_challenge_method
      : "";
  const state = typeof body.state === "string" ? body.state : "";
  const approve = body.approve === true;

  let client;
  try {
    client = await getOAuthClient(clientId);
  } catch (err) {
    console.error("OAuth client lookup failed:", err);
    return Response.json({ error: "Could not verify the app" }, { status: 500 });
  }
  if (!client) {
    return Response.json({ error: "Unknown client_id" }, { status: 400 });
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return Response.json(
      { error: "redirect_uri is not registered for this client" },
      { status: 400 },
    );
  }

  const target = new URL(redirectUri);
  if (state) target.searchParams.set("state", state);

  if (!approve) {
    target.searchParams.set("error", "access_denied");
    return Response.json({ redirectTo: target.toString() });
  }

  if (codeChallengeMethod !== "S256" || !codeChallenge) {
    return Response.json(
      { error: "code_challenge with code_challenge_method=S256 is required" },
      { status: 400 },
    );
  }

  let code: string;
  try {
    code = await createAuthCode({
      uid,
      clientId: client.clientId,
      redirectUri,
      codeChallenge,
    });
  } catch (err) {
    console.error("OAuth authorization code issuance failed:", err);
    return Response.json(
      { error: "Could not complete the connection" },
      { status: 500 },
    );
  }

  target.searchParams.set("code", code);
  return Response.json({ redirectTo: target.toString() });
}
