import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { hashSecret, randomSecret, toDateOrNull } from "./crypto";

/**
 * OAuth refresh tokens (`oauthRefreshTokens/{tokenHash}`). Rotated on every
 * use — the old doc is deleted as the new one is issued, so a stolen refresh
 * token stops working as soon as the legitimate client refreshes. They also
 * expire, so one that leaks while idle doesn't stay valid forever.
 * See docs/MCP_CHATGPT_OAUTH.md.
 */
const COLLECTION = "oauthRefreshTokens";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type RefreshTokenOwner = {
  uid: string;
  clientId: string;
};

/** Issues a refresh token for a uid/client pair. Returns the raw token. */
export async function issueRefreshToken(
  uid: string,
  clientId: string,
): Promise<string> {
  const token = randomSecret("bd_refresh_");
  await getAdminFirestore()
    .collection(COLLECTION)
    .doc(hashSecret(token))
    .set({
      uid,
      clientId,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
  return token;
}

/**
 * Consumes a refresh token and returns its owner, or null if unknown or
 * expired. The doc is deleted in the same transaction either way, so the
 * caller must issue a replacement.
 */
export async function consumeRefreshToken(
  token: string,
): Promise<RefreshTokenOwner | null> {
  if (!token) return null;
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(hashSecret(token));

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    tx.delete(ref);

    const data = snap.data() ?? {};
    const expiresAt = toDateOrNull(data.expiresAt);
    if (!expiresAt || expiresAt.getTime() < Date.now()) return null;

    const { uid, clientId } = data;
    if (typeof uid !== "string" || typeof clientId !== "string") return null;
    return { uid, clientId };
  });
}
