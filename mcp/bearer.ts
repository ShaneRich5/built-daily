import { timingSafeEqual } from "node:crypto";
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";

export function isMcpAuthConfigured(): boolean {
  return Boolean(process.env.MCP_BEARER_TOKEN?.trim());
}

function tokensEqual(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) return false;
  return timingSafeEqual(leftBuf, rightBuf);
}

/** Shared secret verifier for ChatGPT Token auth and Claude request headers. */
export const mcpTokenVerifier: OAuthTokenVerifier = {
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const expected = process.env.MCP_BEARER_TOKEN?.trim() ?? "";
    if (!expected || !tokensEqual(token, expected)) {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid access token");
    }
    return {
      token,
      clientId: "built-daily",
      scopes: ["mcp"],
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
    };
  },
};

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
