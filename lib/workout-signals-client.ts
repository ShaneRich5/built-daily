import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { firestoreToActivityDoc } from "@/lib/activity-mapper";
import { getFirestoreDb } from "@/lib/firebase";
import { firestoreToWorkoutSessionDoc } from "@/lib/workout-session-mapper";
import {
  computeWorkoutSignals,
  type ActivityDaySummary,
  type WorkoutSignals,
} from "@/lib/workout-signals";

/** Recent-history cap — enough for any realistic streak, cheap enough to read on demand. */
const SESSION_LOOKBACK = 400;
const ACTIVITY_LOOKBACK = 400;

/**
 * Fetches a user's completed sessions and logged activities with the client
 * SDK and recomputes their show-up signals from source. Shared by group and
 * public-profile writers so both stay correct the same way.
 */
export async function computeUserWorkoutSignals(uid: string): Promise<WorkoutSignals> {
  const db = getFirestoreDb();
  if (!db) return computeWorkoutSignals([]);

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

  const sessions = [];
  for (const d of sessionsSnap.docs) {
    const session = firestoreToWorkoutSessionDoc(d.data() as Record<string, unknown>);
    if (session) sessions.push(session);
  }

  const activities: ActivityDaySummary[] = [];
  for (const d of activitiesSnap.docs) {
    const activity = firestoreToActivityDoc(d.data() as Record<string, unknown>);
    if (!activity) continue;
    activities.push({
      activityDate: activity.activityDate,
      at: activity.endedAt ?? activity.startedAt ?? activity.createdAt,
    });
  }

  return computeWorkoutSignals(sessions, activities);
}
