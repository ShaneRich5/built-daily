import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { randomBytes } from "node:crypto";

/**
 * OAuth clients registered via Dynamic Client Registration (RFC 7591) — how
 * ChatGPT (and any other MCP client that speaks OAuth) introduces itself
 * before the authorization-code flow. See docs/MCP_CHATGPT_OAUTH.md.
 *
 * Admin-SDK-only collection: `oauthClients/{clientId}`. These are public
 * clients (no secret) — PKCE is what binds a token exchange to the browser
 * session that approved it.
 */
const COLLECTION = "oauthClients";
const MAX_REDIRECT_URIS = 10;

export type OAuthClient = {
  clientId: string;
  clientName: string;
  redirectUris: string[];
};

/**
 * Validation is reported rather than thrown so callers can't confuse a bad
 * registration request (400) with a Firestore/credentials failure (500) —
 * conflating them once leaked an internal file path to an unauthenticated
 * caller.
 */
export type RegisterClientResult =
  | { ok: true; client: OAuthClient }
  | { ok: false; error: string };

/**
 * Registered redirect targets must be exact HTTPS URLs. `http://` is allowed
 * only for loopback hosts so a local MCP client can be tested; a fragment is
 * forbidden outright (RFC 6749 §3.1.2).
 */
export function isAllowedRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === "https:") return true;
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  );
}

/**
 * Registers a new public client. Invalid metadata comes back as
 * `{ ok: false }`; only infrastructure failures (Firestore, credentials)
 * throw, so the route can map the two to different status codes.
 */
export async function registerOAuthClient(
  clientName: string,
  redirectUris: string[],
): Promise<RegisterClientResult> {
  if (redirectUris.length === 0 || redirectUris.length > MAX_REDIRECT_URIS) {
    return {
      ok: false,
      error: `redirect_uris must contain between 1 and ${MAX_REDIRECT_URIS} entries`,
    };
  }
  for (const uri of redirectUris) {
    if (!isAllowedRedirectUri(uri)) {
      return { ok: false, error: `Invalid redirect_uri: ${uri}` };
    }
  }

  const name = clientName.trim().slice(0, 120) || "Unnamed client";
  const clientId = randomBytes(16).toString("hex");
  await getAdminFirestore().collection(COLLECTION).doc(clientId).set({
    clientName: name,
    redirectUris,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, client: { clientId, clientName: name, redirectUris } };
}

/** Looks up a registered client, or null if the id is unknown. */
export async function getOAuthClient(
  clientId: string,
): Promise<OAuthClient | null> {
  if (!clientId) return null;
  const snap = await getAdminFirestore()
    .collection(COLLECTION)
    .doc(clientId)
    .get();
  if (!snap.exists) return null;

  const data = snap.data() ?? {};
  const redirectUris = Array.isArray(data.redirectUris)
    ? data.redirectUris.filter((uri): uri is string => typeof uri === "string")
    : [];
  return {
    clientId: snap.id,
    clientName: typeof data.clientName === "string" ? data.clientName : "",
    redirectUris,
  };
}
