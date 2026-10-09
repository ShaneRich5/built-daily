import { getAdminFirestore } from "@/lib/firebase-admin";
import { hashSecret, randomSecret, toDateOrNull } from "./crypto";

/**
 * One-time OAuth authorization codes (`oauthCodes/{codeHash}`), issued by the
 * consent screen and redeemed once at the token endpoint. Short-lived and
 * single-use — see docs/MCP_CHATGPT_OAUTH.md.
 */
const COLLECTION = "oauthCodes";
const CODE_TTL_MS = 60_000;

export type AuthCodeGrant = {
  uid: string;
  clientId: string;
  redirectUri: string;
  /** PKCE S256 challenge the `/token` exchange must prove it knows the verifier for. */
  codeChallenge: string;
};

/** Issues an authorization code for an approved consent. Returns the raw code. */
export async function createAuthCode(grant: AuthCodeGrant): Promise<string> {
  const code = randomSecret("bd_code_");
  await getAdminFirestore()
    .collection(COLLECTION)
    .doc(hashSecret(code))
    .set({
      uid: grant.uid,
      clientId: grant.clientId,
      redirectUri: grant.redirectUri,
      codeChallenge: grant.codeChallenge,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
  return code;
}

/**
 * Redeems a code exactly once. The doc is deleted inside a transaction
 * whether or not it was still valid, so a replayed code can never succeed —
 * and two concurrent redemptions can't both win.
 */
export async function redeemAuthCode(
  code: string,
): Promise<AuthCodeGrant | null> {
  if (!code) return null;
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(hashSecret(code));

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    tx.delete(ref);

    const data = snap.data() ?? {};
    const expiresAt = toDateOrNull(data.expiresAt);
    if (!expiresAt || expiresAt.getTime() < Date.now()) return null;

    const { uid, clientId, redirectUri, codeChallenge } = data;
    if (
      typeof uid !== "string" ||
      typeof clientId !== "string" ||
      typeof redirectUri !== "string" ||
      typeof codeChallenge !== "string"
    ) {
      return null;
    }
    return { uid, clientId, redirectUri, codeChallenge };
  });
}
