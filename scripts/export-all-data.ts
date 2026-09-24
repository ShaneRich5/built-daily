/**
 * Full backup of the entire Firestore database before Phase 1 data-model
 * changes (see docs/notion Onboarding Readiness page). Walks every top-level
 * collection and known subcollections for every user, not just one account.
 *
 * Run with:
 *   npx tsx scripts/export-all-data.ts
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS pointing at a service account key
 * (the repo-root built-daily-99633-firebase-adminsdk-*.json works locally).
 * Output is written to backups/full-<timestamp>.json and is gitignored.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { getAdminAuth, getAdminFirestore } from "../lib/firebase-admin";
import type { Firestore } from "firebase-admin/firestore";

const USER_SUBCOLLECTIONS = [
  "sessions",
  "plans",
  "scheduledWorkouts",
  "groupMemberships",
  "settings",
  "bodyWeight",
  "activities",
] as const;

async function dumpCollection(
  db: Firestore,
  collectionPath: string,
): Promise<Record<string, unknown>[]> {
  const snap = await db.collection(collectionPath).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const defaultKey =
      "built-daily-99633-firebase-adminsdk-fbsvc-82046d99d0.json";
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
      process.cwd(),
      defaultKey,
    );
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();

  // Enumerate via Firebase Auth, not the Firestore `users` collection: no
  // users/{uid} document has ever been written (see issue #4), so Firestore
  // doesn't materialize the parent doc even though subcollections exist
  // under it. Auth is the source of truth for "which uids exist".
  const authUsers = await auth.listUsers(1000);
  console.log(`Found ${authUsers.users.length} auth users`);

  const users: Record<string, unknown>[] = [];
  for (const record of authUsers.users) {
    const uid = record.uid;
    const userDoc = (await db.doc(`users/${uid}`).get()).data() ?? null;
    const subcollections: Record<string, Record<string, unknown>[]> = {};
    for (const name of USER_SUBCOLLECTIONS) {
      subcollections[name] = await dumpCollection(db, `users/${uid}/${name}`);
    }
    const total = Object.values(subcollections).reduce(
      (n, docs) => n + docs.length,
      0,
    );
    console.log(
      `  users/${uid} (${record.email ?? "no email"}): ${total} subcollection docs`,
    );
    users.push({
      id: uid,
      email: record.email ?? null,
      doc: userDoc,
      ...subcollections,
    });
  }

  const publicProfiles = await dumpCollection(db, "publicProfiles");
  console.log(`publicProfiles: ${publicProfiles.length} docs`);

  const groupsSnap = await db.collection("groups").get();
  const groups: Record<string, unknown>[] = [];
  for (const groupDoc of groupsSnap.docs) {
    const members = await dumpCollection(db, `groups/${groupDoc.id}/members`);
    groups.push({ id: groupDoc.id, ...groupDoc.data(), members });
  }
  console.log(`groups: ${groups.length} docs`);

  const inviteCodes = await dumpCollection(db, "inviteCodes");
  console.log(`inviteCodes: ${inviteCodes.length} docs`);

  const backup = {
    exportedAt: new Date().toISOString(),
    users,
    publicProfiles,
    groups,
    inviteCodes,
  };

  const outDir = path.resolve(process.cwd(), "backups");
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outDir, `full-${stamp}.json`);
  await fs.writeFile(outPath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`\nFull backup written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
