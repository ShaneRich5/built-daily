/**
 * One-off backup of a single user's Firestore data before Phase 1 data-model
 * changes (see docs/notion Onboarding Readiness page). Run with:
 *
 *   npx tsx scripts/export-user-data.ts <email>
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS pointing at a service account key
 * (the repo-root built-daily-99633-firebase-adminsdk-*.json works locally).
 * Output is written to backups/<uid>-<timestamp>.json and is gitignored.
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
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/export-user-data.ts <email>");
    process.exit(1);
  }

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

  const userRecord = await auth.getUserByEmail(email);
  const uid = userRecord.uid;
  console.log(`Found user ${email} -> uid ${uid}`);

  const userDoc = (await db.doc(`users/${uid}`).get()).data() ?? null;

  const subcollections: Record<string, Record<string, unknown>[]> = {};
  for (const name of USER_SUBCOLLECTIONS) {
    subcollections[name] = await dumpCollection(db, `users/${uid}/${name}`);
    console.log(`  users/${uid}/${name}: ${subcollections[name].length} docs`);
  }

  const publicProfile =
    (await db.doc(`publicProfiles/${uid}`).get()).data() ?? null;

  // Groups the user belongs to, pulled from their groupMemberships index.
  const groupIds = subcollections.groupMemberships.map(
    (m) => m.groupId as string,
  );
  const groups: Record<string, unknown>[] = [];
  for (const groupId of groupIds) {
    const groupDoc = (await db.doc(`groups/${groupId}`).get()).data();
    const members = await dumpCollection(db, `groups/${groupId}/members`);
    groups.push({ id: groupId, ...groupDoc, members });
    console.log(`  groups/${groupId}: ${members.length} members`);
  }

  const backup = {
    exportedAt: new Date().toISOString(),
    uid,
    email,
    userDoc,
    publicProfile,
    ...subcollections,
    groups,
  };

  const outDir = path.resolve(process.cwd(), "backups");
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outDir, `${uid}-${stamp}.json`);
  await fs.writeFile(outPath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`\nBackup written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
