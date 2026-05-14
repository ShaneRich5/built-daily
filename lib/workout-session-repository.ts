import { addDoc, collection } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import {
  buildWorkoutSessionDoc,
  sessionDocToFirestore,
  type ActiveWorkoutFinishSnapshot,
} from "@/lib/workout-session-mapper";

/**
 * Persists a completed session under `users/{uid}/sessions`.
 * Returns the new document id, or null if Firebase is not configured or user is not signed in.
 */
export async function saveCompletedWorkoutSession(
  snap: ActiveWorkoutFinishSnapshot,
): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return null;

  const doc = buildWorkoutSessionDoc(snap);
  const payload = sessionDocToFirestore(doc);

  const ref = await addDoc(
    collection(db, "users", user.uid, "sessions"),
    payload,
  );
  return ref.id;
}
