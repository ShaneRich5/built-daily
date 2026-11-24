import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase-admin";

/**
 * Verifies the caller's Firebase ID token (`Authorization: Bearer <idToken>`)
 * and returns their uid, or an error Response: 503 if Admin credentials aren't
 * configured on this deployment (set FIREBASE_SERVICE_ACCOUNT in Vercel; see
 * .env.example), 401 otherwise. For API routes the signed-in app calls.
 */
export async function requireUid(request: Request): Promise<string | Response> {
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
