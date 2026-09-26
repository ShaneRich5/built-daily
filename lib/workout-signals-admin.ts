/**
 * Admin-SDK counterpart to `workout-signals-client.ts`: fetches a user's
 * completed sessions and writes recomputed show-up signals onto their group
 * memberships and public profile. Used by server-side write paths — the MCP
 * server today — so a workout logged there is no longer invisible to groups
 * and public profiles the way it was before this existed.
 */
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { goalWeekStreak } from "@/lib/progress-insights";
import type { WeeklyGoalTarget } from "@/lib/progress-types";
import { activityMapToRecord } from "@/lib/workout-activity";
import { localDateKeyFromMs } from "@/lib/workout-date";
import {
  computeWorkoutSignals,
  type CompletedSessionSummary,
} from "@/lib/workout-signals";

const SESSION_LOOKBACK = 400;

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchUserWorkoutSignals(uid: string) {
  const firestore = getAdminFirestore();
  const snap = await firestore
    .collection("users")
    .doc(uid)
    .collection("sessions")
    .where("status", "==", "completed")
    .orderBy("endedAt", "desc")
    .limit(SESSION_LOOKBACK)
    .get();

  const sessions: CompletedSessionSummary[] = [];
  for (const sessionDoc of snap.docs) {
    const data = sessionDoc.data();
    const startedAt = toDate(data.startedAt);
    if (!startedAt) continue;
    sessions.push({
      status: typeof data.status === "string" ? data.status : "",
      workoutDate: typeof data.workoutDate === "string" ? data.workoutDate : null,
      endedAt: toDate(data.endedAt),
      startedAt,
    });
  }
  return computeWorkoutSignals(sessions);
}

function displayNameFrom(data: Record<string, unknown> | undefined): string | null {
  const name = data?.displayName;
  return typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : null;
}

function weeklyGoalFrom(data: Record<string, unknown> | undefined): WeeklyGoalTarget {
  const goal = data?.weeklyGoal;
  return typeof goal === "number" && [2, 3, 4, 5, 6, 7].includes(Math.round(goal))
    ? (Math.round(goal) as WeeklyGoalTarget)
    : 3;
}

/**
 * Best-effort: recompute `uid`'s show-up signals and push them onto every
 * group they're in and their public profile (only if it exists and is
 * public). Never throws — callers should not let this block a session write.
 */
export async function syncWorkoutSignalsForUser(uid: string): Promise<void> {
  const firestore = getAdminFirestore();

  try {
    const signals = await fetchUserWorkoutSignals(uid);
    const lastWorkoutAt = signals.lastWorkoutAt
      ? Timestamp.fromDate(signals.lastWorkoutAt)
      : null;

    const membershipsSnap = await firestore
      .collection("users")
      .doc(uid)
      .collection("groupMemberships")
      .get();

    if (!membershipsSnap.empty) {
      const [profileSnap, settingsSnap] = await Promise.all([
        firestore.doc(`users/${uid}`).get(),
        firestore.doc(`users/${uid}/settings/progress`).get(),
      ]);
      const displayName = displayNameFrom(profileSnap.data());
      const weeklyGoal = weeklyGoalFrom(settingsSnap.data());
      // Roster streak counts consecutive weeks meeting the goal, not days —
      // see goalWeekStreak and lib/group-repository.ts's client counterpart.
      const rosterStreak = goalWeekStreak(
        signals.activityByDay,
        weeklyGoal,
        localDateKeyFromMs(Date.now()),
      ).current;

      await Promise.all(
        membershipsSnap.docs.map(async (membership) => {
          try {
            const memberRef = firestore.doc(
              `groups/${membership.id}/members/${uid}`,
            );
            const patch: Record<string, unknown> = {
              lastWorkoutDateKey: signals.lastWorkoutDateKey,
              lastWorkoutAt,
              currentStreak: rosterStreak,
              workoutsThisWeek: signals.workoutsThisWeek,
              weeklyGoal,
            };
            if (displayName) patch.displayName = displayName;
            await memberRef.set(patch, { merge: true });
          } catch {
            /* best-effort per group */
          }
        }),
      );
    }

    const publicRef = firestore.doc(`publicProfiles/${uid}`);
    const publicSnap = await publicRef.get();
    if (publicSnap.exists && publicSnap.data()?.profilePublic === true) {
      await publicRef.set(
        {
          currentStreak: signals.currentStreak,
          workoutsThisWeek: signals.workoutsThisWeek,
          lastWorkoutDateKey: signals.lastWorkoutDateKey,
          activityByDay: activityMapToRecord(signals.activityByDay),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
    }
  } catch {
    /* best-effort — never block the caller's write */
  }
}
