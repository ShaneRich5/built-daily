import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import {
  firestoreToWorkoutPlanDoc,
  workoutPlanDocToFirestore,
} from "@/lib/plan-mapper";
import type { WorkoutPlanDoc } from "@/lib/workout-types";

export type SavedWorkoutPlan = {
  id: string;
  plan: WorkoutPlanDoc;
};

function plansCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "plans");
}

/**
 * Live list of the signed-in user's plans (newest `updatedAt` first).
 * Calls `onPlans([])` when Firebase or auth is unavailable.
 */
export function subscribeUserWorkoutPlans(
  onPlans: (plans: SavedWorkoutPlan[]) => void,
): () => void {
  const col = plansCollectionRef();
  if (!col) {
    onPlans([]);
    return () => {};
  }

  const q = query(col, orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const out: SavedWorkoutPlan[] = [];
      for (const d of snap.docs) {
        const parsed = firestoreToWorkoutPlanDoc(d.data() as Record<string, unknown>);
        if (parsed) out.push({ id: d.id, plan: parsed });
      }
      onPlans(out);
    },
    () => {
      onPlans([]);
    },
  );
}

export async function getWorkoutPlan(planId: string): Promise<SavedWorkoutPlan | null> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  const ref = doc(db, "users", uid, "plans", planId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const plan = firestoreToWorkoutPlanDoc(snap.data() as Record<string, unknown>);
  if (!plan) return null;
  return { id: snap.id, plan };
}

export async function createWorkoutPlan(plan: WorkoutPlanDoc): Promise<string | null> {
  const col = plansCollectionRef();
  if (!col) return null;
  const ref = await addDoc(col, workoutPlanDocToFirestore(plan));
  return ref.id;
}

export async function updateWorkoutPlan(
  planId: string,
  plan: WorkoutPlanDoc,
): Promise<boolean> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return false;
  const ref = doc(db, "users", uid, "plans", planId);
  await updateDoc(ref, {
    ...workoutPlanDocToFirestore(plan),
    updatedAt: serverTimestamp(),
  });
  return true;
}

export async function deleteWorkoutPlan(planId: string): Promise<boolean> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return false;
  await deleteDoc(doc(db, "users", uid, "plans", planId));
  return true;
}
