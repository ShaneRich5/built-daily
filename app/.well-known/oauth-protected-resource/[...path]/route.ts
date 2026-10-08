import { oauthCorsPreflight, oauthJson } from "@/mcp/oauth-http";
import {
  MCP_PATH,
  buildResourceMetadata,
  originFromRequest,
} from "@/mcp/oauth-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 9728 protected resource metadata for a specific resource path: the MCP
 * endpoint's own path is appended to the well-known route, so `/api/mcp` is
 * served at `/.well-known/oauth-protected-resource/api/mcp`. Any other path
 * describes a resource this server doesn't have.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (`/${path.join("/")}` !== MCP_PATH) {
    return oauthJson({ error: "Unknown resource" }, { status: 404 });
  }
  return oauthJson(buildResourceMetadata(originFromRequest(request)));
}

export function OPTIONS() {
  return oauthCorsPreflight();
}
