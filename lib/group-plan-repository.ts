/**
 * Plans together (`groups/{groupId}/plans/{planId}`) and the signed-out
 * invite preview (`invitePreviews/{code}`).
 *
 * Saying "I'm in" adds your uid to the plan's `going` list and drops a linked
 * entry on your own planner (`sharedPlanId` + `groupId`). "Can't make it"
 * undoes both. Rules only let you add or remove your own uid.
 */
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import {
  displayNameFromAuth,
  firestoreToInvitePreview,
  firestoreToSharedPlan,
  firstName,
  invitePreviewToFirestore,
  normalizeInviteCode,
  sharedPlanToFirestore,
} from "@/lib/group-mapper";
import {
  GROUP_LIMITS,
  SHARED_PLAN_LIMITS,
  type AccountabilityGroupDoc,
  type GroupMemberDoc,
  type InvitePreviewDoc,
  type InvitePreviewPlan,
  type SharedPlanDoc,
  type SharedPlanExercise,
} from "@/lib/group-types";
import { addScheduledWorkout, deleteEntriesForSharedPlan, findEntriesForSharedPlan } from "@/lib/planner-repository";
import { startOfWeekDateKey } from "@/lib/calendar-views";
import { localDateKeyFromMs } from "@/lib/workout-date";

export type SavedSharedPlan = { id: string; plan: SharedPlanDoc };

const MAX_PREVIEW_PLANS = 10;

function plansCollection(groupId: string) {
  const db = getFirestoreDb();
  if (!db || !groupId) return null;
  return collection(db, "groups", groupId, "plans");
}

/** Live plans together in a group for an inclusive day range, soonest first. */
export function subscribeGroupPlansInRange(
  groupId: string,
  startKey: string,
  endKey: string,
  onPlans: (rows: SavedSharedPlan[]) => void,
): () => void {
  const col = plansCollection(groupId);
  if (!col) {
    onPlans([]);
    return () => {};
  }
  return onSnapshot(
    query(col, where("dateKey", ">=", startKey), where("dateKey", "<=", endKey)),
    (snap) => {
      const out: SavedSharedPlan[] = [];
      for (const d of snap.docs) {
        const plan = firestoreToSharedPlan(d.data() as Record<string, unknown>);
        if (plan) out.push({ id: d.id, plan });
      }
      out.sort(
        (a, b) =>
          a.plan.dateKey.localeCompare(b.plan.dateKey) ||
          (a.plan.time ?? "99").localeCompare(b.plan.time ?? "99"),
      );
      onPlans(out);
    },
    () => onPlans([]),
  );
}

export function subscribeSharedPlan(
  groupId: string,
  planId: string,
  onPlan: (row: SavedSharedPlan | null) => void,
): () => void {
  const col = plansCollection(groupId);
  if (!col || !planId) {
    onPlan(null);
    return () => {};
  }
  return onSnapshot(
    doc(col, planId),
    (snap) => {
      const plan = snap.exists() ? firestoreToSharedPlan(snap.data() as Record<string, unknown>) : null;
      onPlan(plan ? { id: snap.id, plan } : null);
    },
    () => onPlan(null),
  );
}

export type NewSharedPlanInput = {
  groupIds: string[];
  dateKey: string;
  time: string | null;
  where: string | null;
  note: string | null;
  label: string;
  exercises: SharedPlanExercise[];
};

/** Catalog ids only: `/workout?e=` can't rebuild someone else's custom exercise. */
function startableExerciseIds(exercises: SharedPlanExercise[]): string[] {
  return exercises.map((e) => e.id).filter((id) => !id.startsWith("custom-"));
}

function clean(v: string | null, max: number): string | null {
  const t = v?.trim().slice(0, max);
  return t ? t : null;
}

/**
 * Creates the plan in each chosen group, marks you going, and puts one entry
 * on your planner (linked to the first group's plan). Returns the first plan.
 */
export async function createSharedPlan(
  input: NewSharedPlanInput,
): Promise<{ groupId: string; planId: string } | null> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  const label = clean(input.label, SHARED_PLAN_LIMITS.label);
  if (!db || !user || !label || input.groupIds.length === 0) return null;
  const now = new Date();
  const exercises = input.exercises.slice(0, SHARED_PLAN_LIMITS.exercises);

  let first: { groupId: string; planId: string } | null = null;
  for (const groupId of input.groupIds) {
    const plan: SharedPlanDoc = {
      groupId,
      dateKey: input.dateKey,
      time: input.time,
      where: clean(input.where, SHARED_PLAN_LIMITS.where),
      label,
      exercises,
      note: clean(input.note, SHARED_PLAN_LIMITS.note),
      createdBy: user.uid,
      createdByName: displayNameFromAuth(user),
      going: [user.uid],
      goingAt: { [user.uid]: now },
      createdAt: now,
    };
    const ref = await addDoc(collection(db, "groups", groupId, "plans"), sharedPlanToFirestore(plan));
    first ??= { groupId, planId: ref.id };
  }
  if (!first) return null;

  await addScheduledWorkout({
    dateKey: input.dateKey,
    label,
    planId: null,
    exerciseIds: startableExerciseIds(exercises),
    sharedPlanId: first.planId,
    groupId: first.groupId,
  });
  return first;
}

/** "I'm in": join the going list, then add it to your own planner (once). */
export async function joinSharedPlan(groupId: string, planId: string): Promise<boolean> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return false;
  const ref = doc(db, "groups", groupId, "plans", planId);
  const snap = await getDoc(ref);
  const plan = snap.exists() ? firestoreToSharedPlan(snap.data() as Record<string, unknown>) : null;
  if (!plan) return false;
  if (!plan.going.includes(uid)) {
    if (plan.going.length >= SHARED_PLAN_LIMITS.going) return false;
    await updateDoc(ref, {
      going: arrayUnion(uid),
      [`goingAt.${uid}`]: Timestamp.now(),
    });
  }
  const existing = await findEntriesForSharedPlan(planId);
  if (existing.length === 0) {
    await addScheduledWorkout({
      dateKey: plan.dateKey,
      label: plan.label,
      planId: null,
      exerciseIds: startableExerciseIds(plan.exercises),
      sharedPlanId: planId,
      groupId,
    });
  }
  return true;
}

/** "Can't make it": off the going list and off your planner. */
export async function leaveSharedPlan(groupId: string, planId: string): Promise<boolean> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return false;
  await updateDoc(doc(db, "groups", groupId, "plans", planId), {
    going: arrayRemove(uid),
    [`goingAt.${uid}`]: deleteField(),
  });
  await deleteEntriesForSharedPlan(planId);
  return true;
}

/** Creator only (rules check it). Other people's linked planner entries stay theirs. */
export async function cancelSharedPlan(groupId: string, planId: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;
  await deleteDoc(doc(db, "groups", groupId, "plans", planId));
  await deleteEntriesForSharedPlan(planId);
  return true;
}

/** Creator only: change the time, place or note. */
export async function updateSharedPlanDetails(
  groupId: string,
  planId: string,
  patch: { time: string | null; where: string | null; note: string | null },
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;
  await updateDoc(doc(db, "groups", groupId, "plans", planId), {
    time: patch.time,
    where: clean(patch.where, SHARED_PLAN_LIMITS.where),
    note: clean(patch.note, SHARED_PLAN_LIMITS.note),
  });
  return true;
}

// ── Invite preview ──────────────────────────────────────────────────────────

/** Anyone with the link can read this one doc (rules: get only, never list). */
export async function getInvitePreview(codeRaw: string): Promise<InvitePreviewDoc | null> {
  const db = getFirestoreDb();
  const code = normalizeInviteCode(codeRaw);
  if (!db || code.length < 6) return null;
  try {
    const snap = await getDoc(doc(db, "invitePreviews", code));
    return snap.exists() ? firestoreToInvitePreview(snap.data() as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function previewPlan(plan: SharedPlanDoc, members: GroupMemberDoc[]): InvitePreviewPlan {
  const names = new Map(members.map((m) => [m.uid, firstName(m.displayName)]));
  return {
    dateKey: plan.dateKey,
    time: plan.time,
    where: plan.where,
    label: plan.label,
    goingFirstNames: plan.going.map((uid) => names.get(uid)).filter((n): n is string => Boolean(n)),
  };
}

/** Pure: what a signed-out visitor may see. First names and counts only. */
export function buildInvitePreview(input: {
  groupId: string;
  group: AccountabilityGroupDoc;
  members: GroupMemberDoc[];
  inviterName: string;
  plans: SavedSharedPlan[];
  previous: InvitePreviewDoc | null;
  todayKey: string;
}): InvitePreviewDoc {
  const weekStart = startOfWeekDateKey(input.todayKey);
  const workoutsThisWeek = input.members.reduce(
    (sum, m) => sum + m.trainedDays.filter((d) => d >= weekStart && d <= input.todayKey).length,
    0,
  );
  // Keep plans already shared by link (still upcoming), then add the fresh ones.
  const plans: Record<string, InvitePreviewPlan> = {};
  for (const [id, p] of Object.entries(input.previous?.plans ?? {})) {
    if (p.dateKey >= input.todayKey) plans[id] = p;
  }
  for (const { id, plan } of input.plans) plans[id] = previewPlan(plan, input.members);
  const ids = Object.keys(plans)
    .sort((a, b) => plans[a]!.dateKey.localeCompare(plans[b]!.dateKey))
    .slice(0, MAX_PREVIEW_PLANS);
  return {
    groupId: input.groupId,
    groupName: input.group.name,
    kind: input.group.kind,
    invitedByName: firstName(input.inviterName),
    memberFirstNames: input.members.map((m) => firstName(m.displayName)).slice(0, GROUP_LIMITS.maxMembers),
    memberCount: input.group.memberCount,
    workoutsThisWeek,
    plans: Object.fromEntries(ids.map((id) => [id, plans[id]!])),
    updatedAt: new Date(),
  };
}

/**
 * Refreshes `invitePreviews/{code}` from what the inviting member can already
 * see. Called when the invite sheet opens or a link is shared. Best-effort.
 */
export async function refreshInvitePreview(input: {
  groupId: string;
  group: AccountabilityGroupDoc;
  members: GroupMemberDoc[];
  plans: SavedSharedPlan[];
}): Promise<void> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  const code = input.group.inviteCode;
  if (!db || !user || !code) return;
  try {
    const previous = await getInvitePreview(code);
    const next = buildInvitePreview({
      ...input,
      inviterName: displayNameFromAuth(user),
      previous: previous?.groupId === input.groupId ? previous : null,
      todayKey: localDateKeyFromMs(Date.now()),
    });
    await setDoc(doc(db, "invitePreviews", code), invitePreviewToFirestore(next));
  } catch {
    /* the landing falls back to a plain "You're invited" */
  }
}

/** Every plan together in a group from today on (for the invite sheet's plan picker). */
export async function getUpcomingGroupPlans(groupId: string, todayKey: string): Promise<SavedSharedPlan[]> {
  const col = plansCollection(groupId);
  if (!col) return [];
  const snap = await getDocs(query(col, where("dateKey", ">=", todayKey)));
  const out: SavedSharedPlan[] = [];
  for (const d of snap.docs) {
    const plan = firestoreToSharedPlan(d.data() as Record<string, unknown>);
    if (plan) out.push({ id: d.id, plan });
  }
  return out.sort((a, b) => a.plan.dateKey.localeCompare(b.plan.dateKey));
}
