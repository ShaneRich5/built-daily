import path from "node:path";
import {
  cert,
  getApps,
  initializeApp,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App | null = null;

function resolveCredentialsPath(): void {
  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (creds && !path.isAbsolute(creds)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
      process.cwd(),
      creds,
    );
  }
}

/** True when the Admin SDK has credentials available to initialize with. */
export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
  );
}

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  resolveCredentialsPath();
  const json = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  app = json
    ? initializeApp({ credential: cert(JSON.parse(json) as object) })
    : initializeApp({ credential: applicationDefault() });
  return app;
}

/** Shared Admin SDK Firestore instance (server-side only). */
export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

/** Shared Admin SDK Auth instance (server-side only) — used to verify ID tokens. */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
