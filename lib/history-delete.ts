import { doc, writeBatch } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { bumpGroupWorkoutSignals } from "@/lib/group-repository";
import { syncPublicProfileConsistency } from "@/lib/public-profile-repository";

/** Firestore allows 500 writes per batch; stay under it. */
const BATCH_SIZE = 400;

export type HistoryDeleteInput = {
  sessionIds: string[];
  activityIds: string[];
};

/**
 * Permanently deletes several workouts and activities for the signed-in user
 * (History's select mode). Writes go out in batches, then group and public-profile
 * "showing up" signals are recomputed once, instead of once per item as the
 * single-item deletes do.
 *
 * Returns false if not signed in or a batch fails. Batches that already committed
 * stay deleted; the live History list shows what's left.
 */
export async function deleteHistoryItems({
  sessionIds,
  activityIds,
}: HistoryDeleteInput): Promise<boolean> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return false;

  const refs = [
    ...sessionIds
      .filter(Boolean)
      .map((id) => doc(db, "users", uid, "sessions", id)),
    ...activityIds
      .filter(Boolean)
      .map((id) => doc(db, "users", uid, "activities", id)),
  ];
  if (refs.length === 0) return true;

  try {
    for (let i = 0; i < refs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref);
      await batch.commit();
    }
  } catch {
    return false;
  }

  try {
    await bumpGroupWorkoutSignals();
    await syncPublicProfileConsistency();
  } catch {
    /* best-effort, like the single-item deletes */
  }
  return true;
}
