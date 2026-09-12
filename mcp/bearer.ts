import { timingSafeEqual } from "node:crypto";
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";
import { resolveUidForToken } from "./tokens";

const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10;

function tokensEqual(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) return false;
  return timingSafeEqual(leftBuf, rightBuf);
}

/**
 * Verifies a bearer token against per-user tokens stored in Firestore
 * (`mcpTokens/{hash}`, see docs/MCP_MULTI_USER.md) and returns the owning
 * uid via `AuthInfo.extra.uid`.
 *
 * Falls back to a single shared `MCP_BEARER_TOKEN` mapped to `MCP_USER_UID`
 * for the maintainer's own local/admin testing — remove once you no longer
 * need it.
 */
export const mcpTokenVerifier: OAuthTokenVerifier = {
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const uid = await resolveUidForToken(token);
    if (uid) {
      return {
        token,
        clientId: "built-daily",
        scopes: ["mcp"],
        expiresAt: Math.floor(Date.now() / 1000) + TEN_YEARS_SECONDS,
        extra: { uid },
      };
    }

    const legacyToken = process.env.MCP_BEARER_TOKEN?.trim();
    const legacyUid = process.env.MCP_USER_UID?.trim();
    if (legacyToken && legacyUid && tokensEqual(token, legacyToken)) {
      return {
        token,
        clientId: "built-daily-legacy",
        scopes: ["mcp"],
        expiresAt: Math.floor(Date.now() / 1000) + TEN_YEARS_SECONDS,
        extra: { uid: legacyUid },
      };
    }

    throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid access token");
  },
};

/** Pulls the authenticated uid out of `AuthInfo.extra`, set by `mcpTokenVerifier`. */
export function uidFromAuthInfo(authInfo: AuthInfo | undefined): string {
  const uid = authInfo?.extra?.uid;
  if (typeof uid !== "string" || !uid) {
    throw new Error("Request is missing an authenticated uid.");
  }
  return uid;
}

/**
 * Claude custom connectors can send `x-api-key` instead of Authorization.
 * Copy it into Bearer so `requireBearerAuth` sees one scheme.
 */
export function requestWithBearerToken(request: Request): Request {
  if (request.headers.get("authorization")) return request;
  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey) return request;
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  return new Request(request, { headers });
}
