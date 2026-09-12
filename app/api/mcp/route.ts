import {
  createMcpHandler,
  requireBearerAuth,
} from "@modelcontextprotocol/server";
import { createBuiltDailyServer } from "@/mcp/create-server";
import {
  mcpTokenVerifier,
  requestWithBearerToken,
  uidFromAuthInfo,
} from "@/mcp/bearer";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = createMcpHandler((ctx) =>
  createBuiltDailyServer(uidFromAuthInfo(ctx.authInfo)),
);

const gate = requireBearerAuth({
  verifier: mcpTokenVerifier,
  requiredScopes: ["mcp"],
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID, x-api-key",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleMcp(request: Request): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return withCors(
      new Response(
        JSON.stringify({ error: "Firebase Admin credentials are not configured" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
  }

  const authedRequest = requestWithMcpAccept(requestWithBearerToken(request));
  const auth = await gate(authedRequest);
  if (auth instanceof Response) return withCors(auth);

  const response = await handler.fetch(authedRequest, { authInfo: auth });
  return withCors(response);
}

/** Some clients omit SSE in Accept; Streamable HTTP requires both. */
function requestWithMcpAccept(request: Request): Request {
  const accept = request.headers.get("accept") ?? "";
  if (
    accept.includes("application/json") &&
    accept.includes("text/event-stream")
  ) {
    return request;
  }
  const headers = new Headers(request.headers);
  headers.set("Accept", "application/json, text/event-stream");
  return new Request(request, { headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function GET(request: Request) {
  return handleMcp(request);
}

export function POST(request: Request) {
  return handleMcp(request);
}

export function DELETE(request: Request) {
  return handleMcp(request);
}
