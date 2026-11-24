import { requireUid } from "@/lib/api-auth";
import {
  createMcpTokenForUid,
  listMcpTokensForUid,
  revokeMcpToken,
} from "@/mcp/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List the caller's MCP access tokens (metadata only — raw tokens are never stored). */
export async function GET(request: Request) {
  const uid = await requireUid(request);
  if (uid instanceof Response) return uid;

  const tokens = await listMcpTokensForUid(uid);
  return Response.json({
    tokens: tokens.map((t) => ({
      id: t.id,
      label: t.label,
      createdAt: t.createdAt?.toISOString() ?? null,
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    })),
  });
}

/** Generate a new MCP access token for the caller. Returned once — never stored raw. */
export async function POST(request: Request) {
  const uid = await requireUid(request);
  if (uid instanceof Response) return uid;

  let label: string | null = null;
  try {
    const body = (await request.json()) as { label?: unknown };
    if (typeof body.label === "string") label = body.label.slice(0, 80);
  } catch {
    // No/invalid JSON body is fine — label is optional.
  }

  const token = await createMcpTokenForUid(uid, label);
  return Response.json({ token });
}

/** Revoke one of the caller's tokens by id (`?id=<hash>`). */
export async function DELETE(request: Request) {
  const uid = await requireUid(request);
  if (uid instanceof Response) return uid;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const ok = await revokeMcpToken(uid, id);
  if (!ok) {
    return Response.json({ error: "Token not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
