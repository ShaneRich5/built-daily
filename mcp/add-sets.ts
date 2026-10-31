import { getAdminFirestore } from "@/lib/firebase-admin";
import type { SessionLine } from "@/lib/workout-types";
import { syncWorkoutSignalsForUser } from "@/lib/workout-signals-admin";
import { getSessionById } from "./firestore";
import {
  buildSessionLines,
  deriveSessionCounts,
  type McpSetInput,
} from "./session-writer";

/** Matches the `lines.size() <= 40` limit in firestore.rules. */
const MAX_LINES = 40;

export type AddSetsResult =
  | { kind: "ok"; session: Record<string, unknown> }
  | { kind: "not_found" }
  | { kind: "unknown_exercise_id" }
  | { kind: "too_many_exercises" };

/** Index of the last line for `exerciseId`, or -1 if the session doesn't have one. */
function lastLineIndexFor(lines: SessionLine[], exerciseId: string): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].exerciseId === exerciseId) return i;
  }
  return -1;
}

/**
 * Append sets to an exercise in an existing session. If the session already
 * has that exercise, the sets go on its last line; otherwise a new line is
 * added at the end. Existing lines and sets are never changed or removed.
 */
export async function addSetsToSession(
  uid: string,
  sessionId: string,
  exerciseId: string,
  sets: McpSetInput[],
): Promise<AddSetsResult> {
  const built = buildSessionLines([{ exerciseId, sets }]);
  if (built.unknownExerciseIds.length > 0) {
    return { kind: "unknown_exercise_id" };
  }
  const newLine = built.lines[0];

  const firestore = getAdminFirestore();
  const ref = firestore
    .collection("users")
    .doc(uid)
    .collection("sessions")
    .doc(sessionId);

  // Read-modify-write in a transaction so two quick add_sets calls can't
  // drop each other's sets.
  const outcome = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { kind: "not_found" } as const;
    const data = snap.data() as Record<string, unknown>;

    const lines: SessionLine[] = Array.isArray(data.lines)
      ? [...(data.lines as SessionLine[])]
      : [];
    const index = lastLineIndexFor(lines, exerciseId);
    if (index >= 0) {
      lines[index] = {
        ...lines[index],
        sets: [...lines[index].sets, ...newLine.sets],
      };
    } else {
      if (lines.length >= MAX_LINES) {
        return { kind: "too_many_exercises" } as const;
      }
      lines.push(newLine);
    }

    tx.update(ref, { lines, ...deriveSessionCounts(lines) });
    return { kind: "ok", wasCompleted: data.status === "completed" } as const;
  });

  if (outcome.kind !== "ok") return outcome;

  if (outcome.wasCompleted) {
    await syncWorkoutSignalsForUser(uid);
  }

  const session = await getSessionById(uid, sessionId);
  return { kind: "ok", session: session! };
}
