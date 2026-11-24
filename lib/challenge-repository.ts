import {
  Timestamp,
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  challengeDocToFirestore,
  challengeRuleToFirestore,
  firestoreToChallengeDoc,
} from "@/lib/challenge-mapper";
import type {
  ChallengePeriod,
  ChallengeRule,
  SavedChallenge,
} from "@/lib/challenge-types";
import type { DailyMetricKey } from "@/lib/daily-metric-types";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";

function challengesCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "challenges");
}

/**
 * Challenges that end on or after `sinceDateKey`: the running one, one that
 * just finished, and the next one if it's already set. Single-field range, so
 * no composite index.
 */
export function subscribeChallengesEndingSince(
  sinceDateKey: string,
  onChallenges: (rows: SavedChallenge[]) => void,
): () => void {
  const col = challengesCollectionRef();
  if (!col) {
    onChallenges([]);
    return () => {};
  }
  const q = query(col, where("endDate", ">=", sinceDateKey));
  return onSnapshot(
    q,
    (snap) => {
      const out: SavedChallenge[] = [];
      for (const d of snap.docs) {
        const challenge = firestoreToChallengeDoc(
          d.data() as Record<string, unknown>,
        );
        if (challenge) out.push({ id: d.id, challenge });
      }
      out.sort(
        (a, b) =>
          a.challenge.startDate.localeCompare(b.challenge.startDate) ||
          a.challenge.createdAt.getTime() - b.challenge.createdAt.getTime(),
      );
      onChallenges(out);
    },
    () => onChallenges([]),
  );
}

/** A personal challenge over `startDate`–`endDate`: a Sunday–Saturday week or a calendar month. */
export async function startChallenge(input: {
  metric: DailyMetricKey;
  rule: ChallengeRule;
  period: ChallengePeriod;
  startDate: string;
  endDate: string;
}): Promise<string | null> {
  const col = challengesCollectionRef();
  if (!col) return null;
  const now = new Date();
  const ref = await addDoc(
    col,
    challengeDocToFirestore({
      ...input,
      groupId: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }),
  );
  return ref.id;
}

/**
 * Changes the target. Clears `completedAt`, since "done" meant the old rule;
 * the app sets it again if the new rule is already met.
 */
export async function updateChallengeRule(
  challengeId: string,
  rule: ChallengeRule,
): Promise<boolean> {
  const col = challengesCollectionRef();
  if (!col || !challengeId) return false;
  await updateDoc(doc(col, challengeId), {
    rule: challengeRuleToFirestore(rule),
    completedAt: null,
    updatedAt: Timestamp.now(),
  });
  return true;
}

/** Records the first time a challenge was done. */
export async function markChallengeCompleted(
  challengeId: string,
): Promise<boolean> {
  const col = challengesCollectionRef();
  if (!col || !challengeId) return false;
  const now = Timestamp.now();
  await updateDoc(doc(col, challengeId), { completedAt: now, updatedAt: now });
  return true;
}
