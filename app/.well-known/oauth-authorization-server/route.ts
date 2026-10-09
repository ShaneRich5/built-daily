import { oauthCorsPreflight, oauthJson } from "@/mcp/oauth-http";
import {
  buildAuthorizationServerMetadata,
  originFromRequest,
} from "@/mcp/oauth-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 8414 authorization server metadata — how a client finds /authorize, /token and /register. */
export function GET(request: Request) {
  return oauthJson(
    buildAuthorizationServerMetadata(originFromRequest(request)),
  );
}

export function OPTIONS() {
  return oauthCorsPreflight();
}
