import {
  buildOAuthProtectedResourceMetadata,
  type OAuthMetadata,
  type OAuthProtectedResourceMetadata,
} from "@modelcontextprotocol/server";

/**
 * OAuth discovery documents for the MCP endpoint (RFC 8414 authorization
 * server metadata + RFC 9728 protected resource metadata). These are public
 * by design — they carry no secrets, only endpoint locations, and clients
 * must be able to read them before they hold any token.
 *
 * See docs/MCP_CHATGPT_OAUTH.md.
 */

/** Single source of truth for the OAuth surface's paths. */
export const MCP_PATH = "/api/mcp";
export const AUTHORIZE_PATH = "/connect/authorize";
export const TOKEN_PATH = "/api/mcp/oauth/token";
export const REGISTER_PATH = "/api/mcp/oauth/register";

/** The scope `/api/mcp` requires (see requiredScopes in app/api/mcp/route.ts). */
export const MCP_SCOPE = "mcp";

/**
 * The origin this request arrived on. Each host advertises itself as the
 * issuer, which keeps metadata self-consistent when the app is reachable at
 * both a vercel.app domain and a custom one. Redirect targets are never
 * derived from this — they're validated against registered clients.
 */
export function originFromRequest(request: Request): string {
  return new URL(request.url).origin;
}

function isLoopback(origin: string): boolean {
  const { hostname } = new URL(origin);
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function buildAuthorizationServerMetadata(origin: string): OAuthMetadata {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}${AUTHORIZE_PATH}`,
    token_endpoint: `${origin}${TOKEN_PATH}`,
    registration_endpoint: `${origin}${REGISTER_PATH}`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    // Public clients only: PKCE, not a client secret, binds the exchange.
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [MCP_SCOPE],
  };
}

export function buildResourceMetadata(
  origin: string,
): OAuthProtectedResourceMetadata {
  return buildOAuthProtectedResourceMetadata({
    oauthMetadata: buildAuthorizationServerMetadata(origin),
    resourceServerUrl: new URL(`${origin}${MCP_PATH}`),
    resourceName: "Built Daily",
    scopesSupported: [MCP_SCOPE],
    // Local dev serves these over http://localhost; the SDK rejects a
    // non-HTTPS issuer otherwise.
    dangerouslyAllowInsecureIssuerUrl: isLoopback(origin),
  });
}
