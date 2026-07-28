import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import {
  activityDocToFirestore,
  buildActivityDoc,
  firestoreToActivityDoc,
} from "@/lib/activity-mapper";
import type {
  ActivityDoc,
  LogActivityInput,
  SavedActivity,
} from "@/lib/activity-types";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";

function activitiesCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "activities");
}

export function subscribeRecentActivities(
  onActivities: (rows: SavedActivity[]) => void,
  options?: { maxDocs?: number },
): () => void {
  const col = activitiesCollectionRef();
  if (!col) {
    onActivities([]);
    return () => {};
  }
  const maxDocs = options?.maxDocs ?? 60;
  const q = query(col, orderBy("activityDate", "desc"), limit(maxDocs));
  return onSnapshot(
    q,
    (snap) => {
      const out: SavedActivity[] = [];
      for (const d of snap.docs) {
        const activity = firestoreToActivityDoc(
          d.data() as Record<string, unknown>,
        );
        if (activity) out.push({ id: d.id, activity });
      }
      // Stable secondary sort: newer createdAt first within same day.
      out.sort((a, b) => {
        const byDate = b.activity.activityDate.localeCompare(
          a.activity.activityDate,
        );
        if (byDate !== 0) return byDate;
        const aTime = a.activity.activityTime ?? "";
        const bTime = b.activity.activityTime ?? "";
        if (aTime !== bTime) return bTime.localeCompare(aTime);
        return b.activity.createdAt.getTime() - a.activity.createdAt.getTime();
      });
      onActivities(out);
    },
    () => onActivities([]),
  );
}

/** Recent activities of one type (for suggestions). */
export function subscribeActivitiesByType(
  activityTypeId: string,
  onActivities: (rows: SavedActivity[]) => void,
  options?: { maxDocs?: number },
): () => void {
  const col = activitiesCollectionRef();
  if (!col || !activityTypeId) {
    onActivities([]);
    return () => {};
  }
  const maxDocs = options?.maxDocs ?? 20;
  const q = query(
    col,
    where("activityTypeId", "==", activityTypeId),
    orderBy("activityDate", "desc"),
    limit(maxDocs),
  );
  return onSnapshot(
    q,
    (snap) => {
      const out: SavedActivity[] = [];
      for (const d of snap.docs) {
        const activity = firestoreToActivityDoc(
          d.data() as Record<string, unknown>,
        );
        if (activity) out.push({ id: d.id, activity });
      }
      onActivities(out);
    },
    () => onActivities([]),
  );
}

export async function getActivity(
  activityId: string,
): Promise<SavedActivity | null> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid || !activityId) return null;

  const snap = await getDoc(doc(db, "users", uid, "activities", activityId));
  if (!snap.exists()) return null;
  const activity = firestoreToActivityDoc(
    snap.data() as Record<string, unknown>,
  );
  if (!activity) return null;
  return { id: snap.id, activity };
}

export async function logActivity(
  input: LogActivityInput,
): Promise<string | null> {
  const col = activitiesCollectionRef();
  if (!col) return null;
  const docData = buildActivityDoc(input);
  if (!docData) return null;
  const ref = await addDoc(col, activityDocToFirestore(docData));
  return ref.id;
}

export async function updateActivity(
  activityId: string,
  input: LogActivityInput,
): Promise<ActivityDoc | null> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid || !activityId) return null;

  const ref = doc(db, "users", uid, "activities", activityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const existing = firestoreToActivityDoc(
    snap.data() as Record<string, unknown>,
  );
  if (!existing) return null;

  const next = buildActivityDoc(input);
  if (!next) return null;

  const saved: ActivityDoc = {
    ...next,
    visibility: existing.visibility,
    source: existing.source,
    startedAt: existing.startedAt,
    endedAt: existing.endedAt,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };
  await setDoc(ref, activityDocToFirestore(saved));
  return saved;
}

export async function deleteActivity(activityId: string): Promise<boolean> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid || !activityId) return false;
  await deleteDoc(doc(db, "users", uid, "activities", activityId));
  return true;
}
