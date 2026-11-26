/**
 * Opt-in workout sharing, client side. See lib/shared-workouts.ts for what's
 * shared and why it's one doc per member.
 *
 * Order matters for the rules: turning sharing on flips `sharesWorkouts` on
 * the member doc first (the sharedWorkouts write rule checks it); turning it
 * off deletes the copy first, then clears the flag.
 *
 * Deliberately imports nothing from group-repository so it can call this
 * without an import cycle.
 */
import {
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import {
  buildSharedWorkouts,
  firestoreToSharedWorkoutsDoc,
  sharedWorkoutsDocToFirestore,
  type SharedWorkout,
  type SharedWorkoutsDoc,
} from "@/lib/shared-workouts";
import { fetchUserWorkoutHistory } from "@/lib/workout-signals-client";

function sharedWorkoutsRef(db: Firestore, groupId: string, uid: string) {
  return doc(db, "groups", groupId, "sharedWorkouts", uid);
}

/** Replace the member's shared copy in one group. Throws on failure. */
export async function writeSharedWorkouts(
  db: Firestore,
  groupId: string,
  uid: string,
  workouts: SharedWorkout[],
): Promise<void> {
  await setDoc(
    sharedWorkoutsRef(db, groupId, uid),
    sharedWorkoutsDocToFirestore({ uid, workouts, updatedAtMs: Date.now() }),
  );
}

/** Best-effort: remove a member's shared copy (leaving, stopping, or deleting the group). */
export async function deleteSharedWorkouts(
  db: Firestore,
  groupId: string,
  uid: string,
): Promise<void> {
  try {
    await deleteDoc(sharedWorkoutsRef(db, groupId, uid));
  } catch {
    /* already gone, or rules not deployed yet */
  }
}

/** Turn sharing on or off for the signed-in user in one group. */
export async function setWorkoutSharing(
  groupId: string,
  on: boolean,
): Promise<boolean> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid || !groupId) return false;
  const memberRef = doc(db, "groups", groupId, "members", uid);
  try {
    if (on) {
      await updateDoc(memberRef, { sharesWorkouts: true });
      const history = await fetchUserWorkoutHistory(uid);
      try {
        await writeSharedWorkouts(
          db,
          groupId,
          uid,
          buildSharedWorkouts(history.sessions, history.activities),
        );
      } catch (e) {
        // Don't leave the group thinking we share when nothing was written.
        await updateDoc(memberRef, { sharesWorkouts: false }).catch(() => {});
        throw e;
      }
    } else {
      await deleteSharedWorkouts(db, groupId, uid);
      await updateDoc(memberRef, { sharesWorkouts: false });
    }
    return true;
  } catch {
    return false;
  }
}

/** One member's shared workouts, live. `null` = nothing shared (or not allowed). */
export function subscribeSharedWorkouts(
  groupId: string,
  uid: string,
  onData: (doc: SharedWorkoutsDoc | null) => void,
): () => void {
  const db = getFirestoreDb();
  if (!db || !groupId || !uid) {
    onData(null);
    return () => {};
  }
  return onSnapshot(
    sharedWorkoutsRef(db, groupId, uid),
    (snap) =>
      onData(
        snap.exists()
          ? firestoreToSharedWorkoutsDoc(snap.data() as Record<string, unknown>)
          : null,
      ),
    () => onData(null),
  );
}
