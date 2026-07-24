import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  addDoc,
  limit,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import {
  bodyWeightEntryToFirestore,
  firestoreToBodyWeightEntry,
  firestoreToProgressSettings,
  progressSettingsToFirestore,
} from "@/lib/progress-mapper";
import {
  DEFAULT_PROGRESS_SETTINGS,
  type BodyWeightEntryDoc,
  type ProgressSettingsDoc,
  type SavedBodyWeightEntry,
  type WeeklyGoalTarget,
} from "@/lib/progress-types";

const SETTINGS_DOC_ID = "progress";

function settingsDocRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return doc(db, "users", uid, "settings", SETTINGS_DOC_ID);
}

function bodyWeightCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "bodyWeight");
}

export function subscribeProgressSettings(
  onSettings: (settings: ProgressSettingsDoc) => void,
): () => void {
  const ref = settingsDocRef();
  if (!ref) {
    onSettings({ ...DEFAULT_PROGRESS_SETTINGS });
    return () => {};
  }
  return onSnapshot(
    ref,
    (snap) => {
      onSettings(
        firestoreToProgressSettings(
          snap.exists() ? (snap.data() as Record<string, unknown>) : undefined,
        ),
      );
    },
    () => onSettings({ ...DEFAULT_PROGRESS_SETTINGS }),
  );
}

export async function saveProgressSettings(
  patch: Partial<Pick<ProgressSettingsDoc, "weeklyGoal" | "goalWeightLbs">>,
): Promise<boolean> {
  const ref = settingsDocRef();
  if (!ref) return false;
  const existing = await getDoc(ref);
  const prev = firestoreToProgressSettings(
    existing.exists() ? (existing.data() as Record<string, unknown>) : undefined,
  );
  const next: ProgressSettingsDoc = {
    weeklyGoal: patch.weeklyGoal ?? prev.weeklyGoal,
    goalWeightLbs:
      patch.goalWeightLbs !== undefined ? patch.goalWeightLbs : prev.goalWeightLbs,
    updatedAt: new Date(),
  };
  await setDoc(ref, progressSettingsToFirestore(next), { merge: true });
  return true;
}

export async function setWeeklyGoal(weeklyGoal: WeeklyGoalTarget): Promise<boolean> {
  return saveProgressSettings({ weeklyGoal });
}

export function subscribeBodyWeightEntries(
  onEntries: (rows: SavedBodyWeightEntry[]) => void,
  options?: { maxDocs?: number },
): () => void {
  const col = bodyWeightCollectionRef();
  if (!col) {
    onEntries([]);
    return () => {};
  }
  const maxDocs = options?.maxDocs ?? 120;
  const q = query(col, orderBy("dateKey", "asc"), limit(maxDocs));
  return onSnapshot(
    q,
    (snap) => {
      const out: SavedBodyWeightEntry[] = [];
      for (const d of snap.docs) {
        const entry = firestoreToBodyWeightEntry(
          d.data() as Record<string, unknown>,
        );
        if (entry) out.push({ id: d.id, entry });
      }
      onEntries(out);
    },
    () => onEntries([]),
  );
}

export async function logBodyWeight(
  dateKey: string,
  weightLbs: number,
): Promise<string | null> {
  const col = bodyWeightCollectionRef();
  if (!col) return null;
  const weight = Math.round(weightLbs * 10) / 10;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !(weight > 0) || weight > 1000) {
    return null;
  }
  const entry: BodyWeightEntryDoc = {
    dateKey,
    weightLbs: weight,
    createdAt: new Date(),
  };
  const ref = await addDoc(col, bodyWeightEntryToFirestore(entry));
  return ref.id;
}
