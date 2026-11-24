import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import {
  createMcpTokenForUid,
  listMcpTokensForUid,
  revokeMcpToken,
} from "@/mcp/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifies the caller's Firebase ID token and returns their uid, or an error
 * Response — 503 if Admin credentials aren't configured on this deployment
 * (set FIREBASE_SERVICE_ACCOUNT in Vercel; see .env.example), 401 otherwise.
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
    return Response.json(
      { error: "Missing Authorization header" },
      { status: 401 },
    );
  }

  let auth: ReturnType<typeof getAdminAuth>;
  try {
    auth = getAdminAuth();
  } catch (err) {
    console.error("Firebase Admin init failed:", err);
    return Response.json(
      { error: "Firebase Admin credentials are misconfigured" },
      { status: 503 },
    );
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return Response.json(
      { error: "Invalid or expired session" },
      { status: 401 },
    );
  }
}

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
