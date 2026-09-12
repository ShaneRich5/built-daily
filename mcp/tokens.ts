import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";

/**
 * Personal access tokens for the remote MCP endpoint. Doc ID is the token
 * hash, never the raw token — see docs/MCP_MULTI_USER.md.
 */
const COLLECTION = "mcpTokens";
const TOKEN_PREFIX = "bd_live_";

export type McpTokenSummary = {
  id: string;
  label: string | null;
  createdAt: Date | null;
  lastUsedAt: Date | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toDateOrNull(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

/** Creates a new token for `uid`, persists its hash, and returns the raw token (shown once). */
export async function createMcpTokenForUid(
  uid: string,
  label: string | null,
): Promise<string> {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const hash = hashToken(token);
  await getAdminFirestore().collection(COLLECTION).doc(hash).set({
    uid,
    label: label?.trim() || null,
    createdAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });
  return token;
}

/** Lists tokens belonging to `uid` (metadata only — raw tokens are never stored). */
export async function listMcpTokensForUid(
  uid: string,
): Promise<McpTokenSummary[]> {
  const snap = await getAdminFirestore()
    .collection(COLLECTION)
    .where("uid", "==", uid)
    .get();

  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        label: typeof data.label === "string" ? data.label : null,
        createdAt: toDateOrNull(data.createdAt),
        lastUsedAt: toDateOrNull(data.lastUsedAt),
      };
    })
    .sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
}

/** Revokes a token by id, only if it belongs to `uid`. Returns false if not found/owned. */
export async function revokeMcpToken(
  uid: string,
  tokenId: string,
): Promise<boolean> {
  const ref = getAdminFirestore().collection(COLLECTION).doc(tokenId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) return false;
  await ref.delete();
  return true;
}

/**
 * Resolves a bearer token to its owning uid, or null if unknown/revoked.
 * Best-effort touches `lastUsedAt` without blocking the caller.
 */
export async function resolveUidForToken(token: string): Promise<string | null> {
  const ref = getAdminFirestore().collection(COLLECTION).doc(hashToken(token));
  const snap = await ref.get();
  if (!snap.exists) return null;
  const uid = snap.data()?.uid;
  if (typeof uid !== "string" || !uid) return null;

  void ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});
  return uid;
}
