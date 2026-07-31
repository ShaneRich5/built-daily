import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import type {
  ScheduledWorkoutDoc,
  ScheduledWorkoutEntry,
} from "@/lib/planner-types";
import { NOTE_LIMITS } from "@/lib/workout-types";

function scheduledCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "scheduledWorkouts");
}

function parseScheduledEntry(
  id: string,
  raw: Record<string, unknown>,
): ScheduledWorkoutEntry | null {
  const dateKey = raw.dateKey;
  const label = raw.label;
  const planId = raw.planId;
  const exerciseIds = raw.exerciseIds;
  const createdAt = raw.createdAt;
  if (
    typeof dateKey !== "string" ||
    dateKey.length !== 10 ||
    typeof label !== "string" ||
    label.length === 0
  ) {
    return null;
  }
  if (planId != null && typeof planId !== "string") return null;
  if (!Array.isArray(exerciseIds)) return null;
  const ids = exerciseIds.filter((x): x is string => typeof x === "string");
  if (ids.length !== exerciseIds.length) return null;
  const created =
    createdAt instanceof Timestamp ? createdAt.toDate() : new Date(0);
  return {
    id,
    dateKey,
    label: label.slice(0, NOTE_LIMITS.title),
    planId: planId == null || planId === "" ? null : planId,
    exerciseIds: ids.slice(0, 40),
    createdAt: created,
  };
}

/**
 * Live scheduled entries for an inclusive local `YYYY-MM-DD` range.
 */
export function subscribeScheduledWorkoutsInRange(
  startKey: string,
  endKey: string,
  onEntries: (entries: ScheduledWorkoutEntry[]) => void,
): () => void {
  const col = scheduledCollectionRef();
  if (!col || !/^\d{4}-\d{2}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}-\d{2}$/.test(endKey)) {
    onEntries([]);
    return () => {};
  }

  const q = query(
    col,
    where("dateKey", ">=", startKey),
    where("dateKey", "<=", endKey),
  );

  return onSnapshot(
    q,
    (snap) => {
      const out: ScheduledWorkoutEntry[] = [];
      for (const d of snap.docs) {
        const parsed = parseScheduledEntry(
          d.id,
          d.data() as Record<string, unknown>,
        );
        if (parsed) out.push(parsed);
      }
      out.sort((a, b) => {
        const dk = a.dateKey.localeCompare(b.dateKey);
        if (dk !== 0) return dk;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
      onEntries(out);
    },
    () => {
      onEntries([]);
    },
  );
}

/**
 * Live scheduled entries for the given calendar year (local `YYYY-MM-DD` range).
 */
export function subscribeScheduledWorkoutsForYear(
  year: number,
  onEntries: (entries: ScheduledWorkoutEntry[]) => void,
): () => void {
  return subscribeScheduledWorkoutsInRange(
    `${year}-01-01`,
    `${year}-12-31`,
    onEntries,
  );
}

export type NewScheduledWorkoutInput = Pick<
  ScheduledWorkoutDoc,
  "dateKey" | "label" | "planId" | "exerciseIds"
>;

export async function addScheduledWorkout(
  input: NewScheduledWorkoutInput,
): Promise<string | null> {
  const col = scheduledCollectionRef();
  if (!col) return null;

  const label = input.label.trim().slice(0, NOTE_LIMITS.title);
  if (!label) return null;

  const dateKey = input.dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const exerciseIds = input.exerciseIds.slice(0, 40);
  const planId =
    input.planId == null || input.planId === ""
      ? null
      : input.planId.slice(0, 128);

  const ref = await addDoc(col, {
    dateKey,
    label,
    planId,
    exerciseIds,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteScheduledWorkout(entryId: string): Promise<boolean> {
  const col = scheduledCollectionRef();
  if (!col) return false;
  await deleteDoc(doc(col, entryId));
  return true;
}
