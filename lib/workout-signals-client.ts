import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { activityTypeName } from "@/lib/activity-catalog";
import { firestoreToActivityDoc } from "@/lib/activity-mapper";
import { getFirestoreDb } from "@/lib/firebase";
import type {
  SharedWorkoutActivityInput,
  SharedWorkoutSessionInput,
} from "@/lib/shared-workouts";
import { firestoreToWorkoutSessionDoc } from "@/lib/workout-session-mapper";
import {
  computeWorkoutSignals,
  type ActivityDaySummary,
  type WorkoutSignals,
} from "@/lib/workout-signals";

/** Recent-history cap — enough for any realistic streak, cheap enough to read on demand. */
const SESSION_LOOKBACK = 400;
const ACTIVITY_LOOKBACK = 400;

export type UserWorkoutHistory = {
  sessions: SharedWorkoutSessionInput[];
  activities: SharedWorkoutActivityInput[];
};

/** Completed sessions and logged activities, newest first, with the client SDK. */
export async function fetchUserWorkoutHistory(
  uid: string,
): Promise<UserWorkoutHistory> {
  const db = getFirestoreDb();
  if (!db) return { sessions: [], activities: [] };

  const [sessionsSnap, activitiesSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "users", uid, "sessions"),
        where("status", "==", "completed"),
        orderBy("endedAt", "desc"),
        limit(SESSION_LOOKBACK),
      ),
    ),
    getDocs(
      query(
        collection(db, "users", uid, "activities"),
        orderBy("activityDate", "desc"),
        limit(ACTIVITY_LOOKBACK),
      ),
    ),
  ]);

  const sessions: SharedWorkoutSessionInput[] = [];
  for (const d of sessionsSnap.docs) {
    const session = firestoreToWorkoutSessionDoc(
      d.data() as Record<string, unknown>,
    );
    if (session) sessions.push({ id: d.id, ...session });
  }

  const activities: SharedWorkoutActivityInput[] = [];
  for (const d of activitiesSnap.docs) {
    const activity = firestoreToActivityDoc(
      d.data() as Record<string, unknown>,
    );
    if (!activity) continue;
    activities.push({
      id: d.id,
      activityDate: activity.activityDate,
      label: activityTypeName(activity.activityTypeId),
      durationMin: activity.durationMin,
      distanceMiles: activity.distanceMiles,
      at: activity.endedAt ?? activity.startedAt ?? activity.createdAt,
    });
  }

  return { sessions, activities };
}

/** Show-up signals recomputed from already-fetched history. */
export function signalsFromHistory(
  history: UserWorkoutHistory,
): WorkoutSignals {
  const activities: ActivityDaySummary[] = history.activities.map((a) => ({
    activityDate: a.activityDate,
    at: a.at,
    label: a.label,
  }));
  return computeWorkoutSignals(history.sessions, activities);
}

/**
 * Fetches a user's completed sessions and logged activities with the client
 * SDK and recomputes their show-up signals from source. Shared by group and
 * public-profile writers so both stay correct the same way.
 */
export async function computeUserWorkoutSignals(
  uid: string,
): Promise<WorkoutSignals> {
  return signalsFromHistory(await fetchUserWorkoutHistory(uid));
}
