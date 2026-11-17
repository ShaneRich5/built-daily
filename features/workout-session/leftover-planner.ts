/** The finish sheet's planner access, backed by Firestore (`users/{uid}/scheduledWorkouts`). */
import * as Sentry from "@sentry/nextjs";
import {
  addScheduledWorkout,
  appendExercisesToScheduledWorkout,
  findNextPlannedForPlan,
} from "@/lib/planner-repository";
import { localDateKeyFromMs } from "@/lib/workout-date";
import type { LeftoverPlanner } from "@/features/workout-session/leftovers";

export const firestoreLeftoverPlanner: LeftoverPlanner = {
  async findNext(planId) {
    const entry = await findNextPlannedForPlan(planId, localDateKeyFromMs(Date.now()));
    return entry ? { entryId: entry.id, label: entry.label, dateKey: entry.dateKey } : null;
  },

  async save(plan) {
    const writes: Promise<unknown>[] = [];
    if (plan.next && plan.nextIds.length > 0) {
      writes.push(appendExercisesToScheduledWorkout(plan.next.entryId, plan.nextIds));
    }
    if (plan.laterIds.length > 0) {
      writes.push(
        addScheduledWorkout({ dateKey: null, label: plan.laterLabel, planId: null, exerciseIds: plan.laterIds }),
      );
    }
    const results = await Promise.allSettled(writes);
    for (const result of results) {
      if (result.status === "rejected") {
        Sentry.captureException(result.reason, { tags: { flow: "finish-leftovers" } });
      }
    }
  },
};
