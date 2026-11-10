import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import type {
  ScheduledWorkoutDoc,
  ScheduledWorkoutEntry,
  ScheduledWorkoutStatus,
  UnscheduledWorkoutEntry,
} from "@/lib/planner-types";
import { NOTE_LIMITS } from "@/lib/workout-types";
import { removeSelfFromSharedPlan, syncUpcomingPlansToGroups } from "@/lib/group-plan-sync";

/** Groupmates see your next 7 days (day + label); refresh that after any planner write. */
function afterPlannerWrite(): void {
  void syncUpcomingPlansToGroups();
}

function optionalId(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= 128 ? v : null;
}

function asStatus(v: unknown): ScheduledWorkoutStatus {
  return v === "completed" || v === "skipped" ? v : "planned";
}

function scheduledCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "scheduledWorkouts");
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Everything but the day, shared by dated and unscheduled entries. */
function parseEntryFields(
  id: string,
  raw: Record<string, unknown>,
): Omit<ScheduledWorkoutEntry, "dateKey"> | null {
  const label = raw.label;
  const planId = raw.planId;
  const exerciseIds = raw.exerciseIds;
  const createdAt = raw.createdAt;
  if (typeof label !== "string" || label.length === 0) return null;
  if (planId != null && typeof planId !== "string") return null;
  if (!Array.isArray(exerciseIds)) return null;
  const ids = exerciseIds.filter((x): x is string => typeof x === "string");
  if (ids.length !== exerciseIds.length) return null;
  const created =
    createdAt instanceof Timestamp ? createdAt.toDate() : new Date(0);
  const status = asStatus(raw.status);
  const sessionIdRaw = raw.sessionId;
  return {
    id,
    label: label.slice(0, NOTE_LIMITS.title),
    planId: planId == null || planId === "" ? null : planId,
    exerciseIds: ids.slice(0, 40),
    status,
    sessionId:
      status === "completed" && typeof sessionIdRaw === "string" && sessionIdRaw
        ? sessionIdRaw
        : null,
    createdAt: created,
    sharedPlanId: optionalId(raw.sharedPlanId),
    groupId: optionalId(raw.groupId),
  };
}

function parseScheduledEntry(
  id: string,
  raw: Record<string, unknown>,
): ScheduledWorkoutEntry | null {
  const dateKey = raw.dateKey;
  if (typeof dateKey !== "string" || dateKey.length !== 10) return null;
  const fields = parseEntryFields(id, raw);
  return fields ? { ...fields, dateKey } : null;
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

/** Live Unscheduled entries (no day yet) that are still open, oldest first. */
export function subscribeUnscheduledWorkouts(
  onEntries: (entries: UnscheduledWorkoutEntry[]) => void,
): () => void {
  const col = scheduledCollectionRef();
  if (!col) {
    onEntries([]);
    return () => {};
  }
  return onSnapshot(
    query(col, where("dateKey", "==", null)),
    (snap) => {
      const out: UnscheduledWorkoutEntry[] = [];
      for (const d of snap.docs) {
        const fields = parseEntryFields(d.id, d.data() as Record<string, unknown>);
        if (fields && fields.status === "planned") out.push({ ...fields, dateKey: null });
      }
      out.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      onEntries(out);
    },
    () => onEntries([]),
  );
}

export type NewScheduledWorkoutInput = Pick<
  ScheduledWorkoutDoc,
  "label" | "planId" | "exerciseIds"
> & {
  /** A local day, or null for Unscheduled. */
  dateKey: string | null;
  /** Links the entry to a plan together ("I'm in"). Both or neither. */
  sharedPlanId?: string | null;
  groupId?: string | null;
};

export async function addScheduledWorkout(
  input: NewScheduledWorkoutInput,
): Promise<string | null> {
  const col = scheduledCollectionRef();
  if (!col) return null;

  const label = input.label.trim().slice(0, NOTE_LIMITS.title);
  if (!label) return null;

  const dateKey = input.dateKey == null ? null : input.dateKey.trim();
  if (dateKey !== null && !DATE_KEY.test(dateKey)) return null;

  const exerciseIds = input.exerciseIds.slice(0, 40);
  const planId =
    input.planId == null || input.planId === ""
      ? null
      : input.planId.slice(0, 128);

  const shared =
    input.sharedPlanId && input.groupId
      ? { sharedPlanId: input.sharedPlanId.slice(0, 128), groupId: input.groupId.slice(0, 128) }
      : {};

  const ref = await addDoc(col, {
    dateKey,
    label,
    planId,
    exerciseIds,
    status: "planned",
    sessionId: null,
    createdAt: serverTimestamp(),
    ...shared,
  });
  afterPlannerWrite();
  return ref.id;
}

export type ScheduledWorkoutPatch = {
  /** Reschedule to another local day, or null to move it to Unscheduled. */
  dateKey?: string | null;
  label?: string;
  status?: ScheduledWorkoutStatus;
  /** Session that completed the entry; ignored unless status is `completed`. */
  sessionId?: string | null;
};

/**
 * Update a planner entry (reschedule, mark done, skip). Always writes `status`
 * and `sessionId` so entries created before those fields gain them on first edit.
 */
export async function updateScheduledWorkout(
  entryId: string,
  patch: ScheduledWorkoutPatch,
): Promise<boolean> {
  const col = scheduledCollectionRef();
  if (!col || !entryId) return false;

  const next: Record<string, unknown> = {};

  if (patch.dateKey !== undefined) {
    const dateKey = patch.dateKey == null ? null : patch.dateKey.trim();
    if (dateKey !== null && !DATE_KEY.test(dateKey)) return false;
    next.dateKey = dateKey;
  }

  if (patch.label !== undefined) {
    const label = patch.label.trim().slice(0, NOTE_LIMITS.title);
    if (!label) return false;
    next.label = label;
  }

  if (patch.status !== undefined) {
    next.status = patch.status;
    next.sessionId =
      patch.status === "completed" && patch.sessionId
        ? patch.sessionId.slice(0, 128)
        : null;
  }

  if (Object.keys(next).length === 0) return false;

  await updateDoc(doc(col, entryId), next);
  afterPlannerWrite();
  return true;
}

export type ScheduledWorkoutMove = { id: string; dateKey: string | null };

/**
 * Moves several entries at once (a swap, or pushing the week back) so the
 * planner never shows a half-applied shuffle.
 */
export async function moveScheduledWorkouts(moves: ScheduledWorkoutMove[]): Promise<boolean> {
  const db = getFirestoreDb();
  const col = scheduledCollectionRef();
  if (!db || !col || moves.length === 0) return false;
  if (moves.some((m) => !m.id || (m.dateKey !== null && !DATE_KEY.test(m.dateKey)))) return false;
  const batch = writeBatch(db);
  // Only open entries move, so status/sessionId are always planned/null; writing
  // them also backfills entries created before those fields existed (rules need them).
  for (const move of moves) {
    batch.update(doc(col, move.id), { dateKey: move.dateKey, status: "planned", sessionId: null });
  }
  await batch.commit();
  afterPlannerWrite();
  return true;
}

export async function deleteScheduledWorkout(entryId: string): Promise<boolean> {
  const col = scheduledCollectionRef();
  if (!col) return false;
  const ref = doc(col, entryId);
  // Removing a plan-together entry from your planner also takes you off its going list.
  const snap = await getDoc(ref).catch(() => null);
  const data = snap?.exists() ? (snap.data() as Record<string, unknown>) : null;
  await deleteDoc(ref);
  const sharedPlanId = optionalId(data?.sharedPlanId);
  const groupId = optionalId(data?.groupId);
  if (sharedPlanId && groupId) void removeSelfFromSharedPlan(groupId, sharedPlanId);
  afterPlannerWrite();
  return true;
}

/** The signed-in user's planner entries linked to one plan together. */
export async function findEntriesForSharedPlan(sharedPlanId: string): Promise<string[]> {
  const col = scheduledCollectionRef();
  if (!col || !sharedPlanId) return [];
  const snap = await getDocs(query(col, where("sharedPlanId", "==", sharedPlanId)));
  return snap.docs.map((d) => d.id);
}

/** Deletes linked entries without touching the plan's going list (the caller already did). */
export async function deleteEntriesForSharedPlan(sharedPlanId: string): Promise<void> {
  const db = getFirestoreDb();
  const col = scheduledCollectionRef();
  if (!db || !col) return;
  const ids = await findEntriesForSharedPlan(sharedPlanId);
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  for (const id of ids) batch.delete(doc(col, id));
  await batch.commit();
  afterPlannerWrite();
}

export type CopyLastWeekResult = {
  /** New entries created for the current week. */
  added: number;
  /** Last week's entries whose target day this week was already planned. */
  skippedExisting: number;
};

/**
 * Copies last week's scheduled workouts (label/planId/exerciseIds, each
 * dateKey shifted +7 days) into the week starting at `currentWeekStartKey`.
 * Note-only reminders (no exercises) aren't recurring plans, so they're left
 * alone. A day already planned this week is left untouched rather than
 * overwritten.
 */
export async function copyLastWeekPlan(
  currentWeekStartKey: string,
): Promise<CopyLastWeekResult | null> {
  const col = scheduledCollectionRef();
  if (!col || !/^\d{4}-\d{2}-\d{2}$/.test(currentWeekStartKey)) return null;

  const lastWeekStartKey = addDaysToDateKey(currentWeekStartKey, -7);
  const lastWeekEndKey = addDaysToDateKey(currentWeekStartKey, -1);
  const currentWeekEndKey = addDaysToDateKey(currentWeekStartKey, 6);

  const parseDocs = (docs: { id: string; data: () => unknown }[]) =>
    docs
      .map((d) => parseScheduledEntry(d.id, d.data() as Record<string, unknown>))
      .filter((e): e is ScheduledWorkoutEntry => e !== null);

  const [lastWeekSnap, currentWeekSnap] = await Promise.all([
    getDocs(
      query(
        col,
        where("dateKey", ">=", lastWeekStartKey),
        where("dateKey", "<=", lastWeekEndKey),
      ),
    ),
    getDocs(
      query(
        col,
        where("dateKey", ">=", currentWeekStartKey),
        where("dateKey", "<=", currentWeekEndKey),
      ),
    ),
  ]);

  const plannedDateKeysThisWeek = new Set(
    parseDocs(currentWeekSnap.docs).map((e) => e.dateKey),
  );

  let added = 0;
  let skippedExisting = 0;

  for (const entry of parseDocs(lastWeekSnap.docs)) {
    if (entry.exerciseIds.length === 0) continue;

    const targetDateKey = addDaysToDateKey(entry.dateKey, 7);
    if (plannedDateKeysThisWeek.has(targetDateKey)) {
      skippedExisting++;
      continue;
    }

    await addDoc(col, {
      dateKey: targetDateKey,
      label: entry.label,
      planId: entry.planId,
      exerciseIds: entry.exerciseIds,
      status: "planned",
      sessionId: null,
      createdAt: serverTimestamp(),
    });
    plannedDateKeysThisWeek.add(targetDateKey);
    added++;
  }

  if (added > 0) afterPlannerWrite();
  return { added, skippedExisting };
}
