import { createHash, timingSafeEqual } from "node:crypto";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { oauthCorsPreflight, oauthJson } from "@/mcp/oauth-http";
import { redeemAuthCode } from "@/mcp/oauth-codes";
import {
  consumeRefreshToken,
  issueRefreshToken,
} from "@/mcp/oauth-refresh-tokens";
import { MCP_SCOPE } from "@/mcp/oauth-metadata";
import { createMcpTokenForUid } from "@/mcp/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth token endpoint: exchanges an authorization code (with its PKCE
 * verifier) or a refresh token for an MCP access token.
 *
 * There is no client secret — these are public clients, so PKCE is the only
 * thing binding an exchange to the browser session that approved it, and
 * refresh tokens rotate on every use.
 *
 * See docs/MCP_CHATGPT_OAUTH.md.
 */
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

/** RFC 6749 §5.1: token responses must never be cached. */
function tokenJson(body: unknown, status = 200): Response {
  return oauthJson(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function oauthError(
  error: string,
  description: string,
  status = 400,
): Response {
  return tokenJson({ error, error_description: description }, status);
}

/** Token endpoints take form-encoded bodies; some clients send JSON instead. */
async function readParams(
  request: Request,
): Promise<Record<string, string> | null> {
  try {
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === "string") params[key] = value;
      }
      return params;
    }
    const form = await request.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") params[key] = value;
    }
    return params;
  } catch {
    return null;
  }
}

/** PKCE S256 (RFC 7636). `plain` is deliberately unsupported. */
function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  if (codeVerifier.length < 43 || codeVerifier.length > 128) return false;
  const computed = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const expected = Buffer.from(codeChallenge);
  const actual = Buffer.from(computed);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

async function issueTokens(uid: string, clientId: string): Promise<Response> {
  const accessToken = await createMcpTokenForUid(uid, null, {
    clientId,
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000),
  });
  const refreshToken = await issueRefreshToken(uid, clientId);

  return tokenJson({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: MCP_SCOPE,
  });
}

async function handleAuthorizationCode(
  params: Record<string, string>,
): Promise<Response> {
  const { code = "", code_verifier = "", client_id = "", redirect_uri = "" } =
    params;
  if (!code || !code_verifier) {
    return oauthError(
      "invalid_request",
      "code and code_verifier are required",
    );
  }

  const grant = await redeemAuthCode(code);
  if (!grant) {
    return oauthError("invalid_grant", "Authorization code is invalid or expired");
  }
  if (client_id !== grant.clientId) {
    return oauthError("invalid_grant", "Authorization code was issued to another client");
  }
  // RFC 6749 §4.1.3: the redirect_uri must match the one in the /authorize request.
  if (redirect_uri !== grant.redirectUri) {
    return oauthError("invalid_grant", "redirect_uri does not match the authorization request");
  }
  if (!verifyPkce(code_verifier, grant.codeChallenge)) {
    return oauthError("invalid_grant", "PKCE verification failed");
  }

  return issueTokens(grant.uid, grant.clientId);
}

async function handleRefreshToken(
  params: Record<string, string>,
): Promise<Response> {
  const { refresh_token = "", client_id = "" } = params;
  if (!refresh_token) {
    return oauthError("invalid_request", "refresh_token is required");
  }

  const owner = await consumeRefreshToken(refresh_token);
  if (!owner) {
    return oauthError("invalid_grant", "Refresh token is invalid or already used");
  }
  if (client_id && client_id !== owner.clientId) {
    return oauthError("invalid_grant", "Refresh token was issued to another client");
  }

  return issueTokens(owner.uid, owner.clientId);
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return oauthError("server_error", "Server is not configured", 503);
  }

  const params = await readParams(request);
  if (!params) {
    return oauthError("invalid_request", "Could not parse request body");
  }

  try {
    switch (params.grant_type) {
      case "authorization_code":
        return await handleAuthorizationCode(params);
      case "refresh_token":
        return await handleRefreshToken(params);
      default:
        return oauthError(
          "unsupported_grant_type",
          "Supported grant types: authorization_code, refresh_token",
        );
    }
  } catch (err) {
    // Firestore/credentials failure — keep internals out of the response.
    console.error("OAuth token exchange failed:", err);
    return oauthError("server_error", "Token exchange failed", 500);
  }
}

export function OPTIONS() {
  return oauthCorsPreflight();
}
