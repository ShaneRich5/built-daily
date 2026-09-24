import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { firestoreToWorkoutSessionDoc } from "@/lib/workout-session-mapper";
import { computeWorkoutSignals, type WorkoutSignals } from "@/lib/workout-signals";

/** Recent-history cap — enough for any realistic streak, cheap enough to read on demand. */
const SESSION_LOOKBACK = 400;

/**
 * Fetches a user's completed sessions with the client SDK and recomputes
 * their show-up signals from source. Shared by group and public-profile
 * writers so both stay correct the same way.
 */
export async function computeUserWorkoutSignals(uid: string): Promise<WorkoutSignals> {
  const db = getFirestoreDb();
  if (!db) return computeWorkoutSignals([]);

  const q = query(
    collection(db, "users", uid, "sessions"),
    where("status", "==", "completed"),
    orderBy("endedAt", "desc"),
    limit(SESSION_LOOKBACK),
  );
  const snap = await getDocs(q);
  const sessions = [];
  for (const d of snap.docs) {
    const session = firestoreToWorkoutSessionDoc(d.data() as Record<string, unknown>);
    if (session) sessions.push(session);
  }
  return computeWorkoutSignals(sessions);
}
