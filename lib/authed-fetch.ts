import { getFirebaseAuth } from "@/lib/firebase";

/** `fetch` with the signed-in user's Firebase ID token, for our own API routes. */
export async function authedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error("Not signed in");
  const idToken = await user.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${idToken}`);
  return fetch(path, { ...init, headers });
}
