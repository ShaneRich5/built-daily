import { oauthCorsPreflight, oauthJson } from "@/mcp/oauth-http";
import { buildResourceMetadata, originFromRequest } from "@/mcp/oauth-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 9728 protected resource metadata at the bare well-known path, for
 * clients that probe the origin rather than the resource-specific path
 * (which `[...path]/route.ts` serves).
 */
export function GET(request: Request) {
  return oauthJson(buildResourceMetadata(originFromRequest(request)));
}

export function OPTIONS() {
  return oauthCorsPreflight();
}
