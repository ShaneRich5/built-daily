/**
 * Migrates existing data to the Phase 1 shapes (see GitHub issues #4, #5, #9):
 *   - creates the `users/{uid}` profile document
 *   - adds `status` / `sessionId` to `scheduledWorkouts` entries
 *   - adds `weeklyGoal` to `groups/{groupId}/members/{uid}` documents
 *
 * Run a preview first, then apply:
 *   npx tsx scripts/backfill-phase-1.ts
 *   npx tsx scripts/backfill-phase-1.ts --apply
 *
 * Uses the Admin SDK, so it bypasses security rules and can run before the
 * updated firestore.rules are deployed. Take a backup first:
 *   npx tsx scripts/export-all-data.ts
 */
import path from "node:path";
import { getAdminAuth, getAdminFirestore } from "../lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const DEFAULT_WEEKLY_GOAL = 3;

function displayNameFor(user: {
  displayName?: string;
  email?: string;
}): string {
  const name = user.displayName?.trim();
  if (name) return name.slice(0, 80);
  const local = user.email?.trim().split("@")[0]?.trim();
  return local ? local.slice(0, 80) : "Member";
}

async function main() {
  const apply = process.argv.includes("--apply");

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
      process.cwd(),
      "built-daily-99633-firebase-adminsdk-fbsvc-82046d99d0.json",
    );
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const changes: string[] = [];

  const authUsers = await auth.listUsers(1000);

  for (const record of authUsers.users) {
    const uid = record.uid;

    // 1. users/{uid} profile document. Timezone starts as UTC; the client
    // corrects it to the device zone on next sign-in.
    const profileRef = db.doc(`users/${uid}`);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      changes.push(`create users/${uid} (profile)`);
      if (apply) {
        const now = Timestamp.now();
        await profileRef.set(
          {
            displayName: displayNameFor(record),
            timezone: "UTC",
            units: "imperial",
            onboardingCompletedAt: null,
            createdAt: now,
            updatedAt: now,
          },
          { merge: true },
        );
      }
    }

    // 2. Planner entries gain status + sessionId.
    const scheduledSnap = await db
      .collection(`users/${uid}/scheduledWorkouts`)
      .get();
    for (const entry of scheduledSnap.docs) {
      const data = entry.data();
      if (data.status !== undefined && data.sessionId !== undefined) continue;
      changes.push(`update users/${uid}/scheduledWorkouts/${entry.id} (status)`);
      if (apply) {
        await entry.ref.set(
          {
            status: data.status ?? "planned",
            sessionId: data.sessionId ?? null,
          },
          { merge: true },
        );
      }
    }

    // 3. Group member docs gain the owner's weekly goal.
    const settingsSnap = await db.doc(`users/${uid}/settings/progress`).get();
    const weeklyGoalRaw = settingsSnap.data()?.weeklyGoal;
    const weeklyGoal =
      typeof weeklyGoalRaw === "number" &&
      [2, 3, 4, 5, 6, 7].includes(Math.round(weeklyGoalRaw))
        ? Math.round(weeklyGoalRaw)
        : DEFAULT_WEEKLY_GOAL;

    const membershipsSnap = await db
      .collection(`users/${uid}/groupMemberships`)
      .get();
    for (const membership of membershipsSnap.docs) {
      const memberRef = db.doc(`groups/${membership.id}/members/${uid}`);
      const memberSnap = await memberRef.get();
      if (!memberSnap.exists || memberSnap.data()?.weeklyGoal !== undefined) {
        continue;
      }
      changes.push(
        `update groups/${membership.id}/members/${uid} (weeklyGoal ${weeklyGoal})`,
      );
      if (apply) {
        await memberRef.set({ weeklyGoal }, { merge: true });
      }
    }
  }

  if (changes.length === 0) {
    console.log("Nothing to backfill — all documents already match Phase 1.");
    return;
  }

  console.log(`${apply ? "Applied" : "Would apply"} ${changes.length} change(s):`);
  for (const line of changes) console.log(`  ${line}`);
  if (!apply) console.log("\nRe-run with --apply to write these changes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
