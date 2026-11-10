/**
 * Keeps each member doc's `upcomingPlans` (the next 7 days of the user's own
 * planner, day + label only) fresh, so groupmates can see "planned" without
 * ever reading another user's private planner.
 *
 * There's no Cloud Function, so this runs from the client:
 * - after every planner write (planner-repository calls it), and
 * - when the user opens Home or Groups (`syncUpcomingPlansToGroupsThrottled`),
 *   which also rolls the 7-day window forward as days pass.
 *
 * Best-effort everywhere: a failed sync never blocks the planner write.
 *
 * Deliberately imports nothing from group-repository or planner-repository so
 * both can call it without an import cycle.
 */
import {
  arrayRemove,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { GROUP_LIMITS, type MemberUpcomingPlan } from "@/lib/group-types";
import { firestoreToProgressSettings } from "@/lib/progress-mapper";
import { localDateKeyFromMs } from "@/lib/workout-date";

/** Pure: planner rows → what a member doc carries. Open plans only, soonest first. */
export function upcomingPlansFromEntries(
  entries: { dateKey: unknown; label: unknown; status?: unknown }[],
  todayKey: string,
): MemberUpcomingPlan[] {
  const endKey = addDaysToDateKey(todayKey, GROUP_LIMITS.upcomingPlanDays - 1);
  const out: MemberUpcomingPlan[] = [];
  for (const e of entries) {
    if (typeof e.dateKey !== "string" || typeof e.label !== "string") continue;
    if (e.status === "completed" || e.status === "skipped") continue;
    if (e.dateKey < todayKey || e.dateKey > endKey) continue;
    const label = e.label.trim().slice(0, GROUP_LIMITS.workoutLabel);
    if (label) out.push({ dateKey: e.dateKey, label });
  }
  out.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return out.slice(0, GROUP_LIMITS.upcomingPlansMax);
}

export async function syncUpcomingPlansToGroups(): Promise<void> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return;
  try {
    const memberships = await getDocs(collection(db, "users", uid, "groupMemberships"));
    if (memberships.empty) return;

    const todayKey = localDateKeyFromMs(Date.now());
    const endKey = addDaysToDateKey(todayKey, GROUP_LIMITS.upcomingPlanDays - 1);
    const [planned, settings] = await Promise.all([
      getDocs(
        query(
          collection(db, "users", uid, "scheduledWorkouts"),
          where("dateKey", ">=", todayKey),
          where("dateKey", "<=", endKey),
        ),
      ),
      getDoc(doc(db, "users", uid, "settings", "progress")),
    ]);
    const upcomingPlans = upcomingPlansFromEntries(
      planned.docs.map((d) => d.data() as { dateKey: unknown; label: unknown; status?: unknown }),
      todayKey,
    );
    // Member rows written before weeklyGoal existed fail the self-update rule
    // without it, so it rides along.
    const weeklyGoal = firestoreToProgressSettings(
      settings.exists() ? (settings.data() as Record<string, unknown>) : undefined,
    ).weeklyGoal;

    await Promise.all(
      memberships.docs.map(async (m) => {
        try {
          await updateDoc(doc(db, "groups", m.id, "members", uid), { upcomingPlans, weeklyGoal });
        } catch {
          /* best-effort per group */
        }
      }),
    );
  } catch {
    /* best-effort */
  }
}

const THROTTLE_MS = 10 * 60 * 1000;
let lastThrottledSync = 0;

/** For "the user opened the app": at most once every 10 minutes per tab. */
export function syncUpcomingPlansToGroupsThrottled(): void {
  const now = Date.now();
  if (now - lastThrottledSync < THROTTLE_MS) return;
  lastThrottledSync = now;
  void syncUpcomingPlansToGroups();
}

/**
 * Removes the signed-in user from a shared plan's going list. Used when they
 * delete the linked planner entry, so the group doesn't keep showing them.
 */
export async function removeSelfFromSharedPlan(groupId: string, planId: string): Promise<void> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid || !groupId || !planId) return;
  try {
    await updateDoc(doc(db, "groups", groupId, "plans", planId), {
      going: arrayRemove(uid),
      [`goingAt.${uid}`]: deleteField(),
    });
  } catch {
    /* plan may be gone, or the user already left */
  }
}
