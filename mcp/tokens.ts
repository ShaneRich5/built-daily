import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { hashSecret, randomSecret, toDateOrNull } from "./crypto";

/**
 * Access tokens for the remote MCP endpoint. Doc ID is the token hash, never
 * the raw token — see docs/MCP_MULTI_USER.md.
 *
 * Two kinds share this collection:
 *  - Personal access tokens (Claude): user-labeled, non-expiring, generated
 *    from Settings.
 *  - OAuth-issued access tokens (ChatGPT): carry a `clientId` and an
 *    `expiresAt`, minted by the token endpoint. See docs/MCP_CHATGPT_OAUTH.md.
 */
const COLLECTION = "mcpTokens";
const PAT_PREFIX = "bd_live_";
const OAUTH_PREFIX = "bd_oauth_";

export type McpTokenSummary = {
  id: string;
  label: string | null;
  createdAt: Date | null;
  lastUsedAt: Date | null;
};

export type ResolvedMcpToken = {
  uid: string;
  /** Null for non-expiring personal access tokens. */
  expiresAt: Date | null;
};

type CreateTokenOptions = {
  /** Set for OAuth-issued tokens; identifies the registered client. */
  clientId?: string;
  /** Set for OAuth-issued tokens; enforced on every lookup. */
  expiresAt?: Date;
};

/** Creates a new token for `uid`, persists its hash, and returns the raw token (shown once). */
export async function createMcpTokenForUid(
  uid: string,
  label: string | null,
  options: CreateTokenOptions = {},
): Promise<string> {
  const isOAuth = Boolean(options.clientId);
  const token = randomSecret(isOAuth ? OAUTH_PREFIX : PAT_PREFIX);
  await getAdminFirestore()
    .collection(COLLECTION)
    .doc(hashSecret(token))
    .set({
      uid,
      label: label?.trim() || null,
      clientId: options.clientId ?? null,
      expiresAt: options.expiresAt ?? null,
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: null,
    });
  return token;
}

/**
 * Lists a user's personal access tokens for the Settings UI. OAuth-issued
 * tokens are excluded — they're short-lived plumbing, not something the user
 * manages by hand. Filtered in memory so existing PAT docs written before
 * `clientId` existed still list correctly.
 */
export async function listMcpTokensForUid(
  uid: string,
): Promise<McpTokenSummary[]> {
  const snap = await getAdminFirestore()
    .collection(COLLECTION)
    .where("uid", "==", uid)
    .get();

  return snap.docs
    .filter((doc) => !doc.data().clientId)
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
 * Resolves a bearer token to its owner, or null if unknown, revoked, or
 * expired. Best-effort touches `lastUsedAt` without blocking the caller.
 */
export async function resolveMcpToken(
  token: string,
): Promise<ResolvedMcpToken | null> {
  const ref = getAdminFirestore().collection(COLLECTION).doc(hashSecret(token));
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() ?? {};
  const uid = data.uid;
  if (typeof uid !== "string" || !uid) return null;

  const expiresAt = toDateOrNull(data.expiresAt);
  if (expiresAt && expiresAt.getTime() < Date.now()) return null;

  void ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});
  return { uid, expiresAt };
}
