/** Lifecycle of a planned day. Docs written before this field default to `planned`. */
export type ScheduledWorkoutStatus = "planned" | "completed" | "skipped";

/** One scheduled workout idea under `users/{uid}/scheduledWorkouts`. */
export type ScheduledWorkoutDoc = {
  /** Local calendar day `YYYY-MM-DD`. */
  dateKey: string;
  /** Short label (often the template name). */
  label: string;
  /** Firestore plan id, starter id (`starter-*`), or null for note-only rows. */
  planId: string | null;
  /** Exercise ids for `/workout` URL `e` param; empty when note-only. */
  exerciseIds: string[];
  status: ScheduledWorkoutStatus;
  /** Session that completed this entry; only set when `status` is `completed`. */
  sessionId: string | null;
  createdAt: Date;
  /**
   * Set when this entry came from saying "I'm in" to a plan together
   * (`groups/{groupId}/plans/{sharedPlanId}`). Missing on ordinary entries.
   */
  sharedPlanId?: string | null;
  groupId?: string | null;
};

export type ScheduledWorkoutEntry = ScheduledWorkoutDoc & { id: string };

/**
 * A planned workout with no day yet (the planner's Unscheduled tray).
 * Stored as a scheduledWorkouts doc with `dateKey: null`, so date-range
 * queries never return it.
 */
export type UnscheduledWorkoutEntry = Omit<ScheduledWorkoutEntry, "dateKey"> & { dateKey: null };
