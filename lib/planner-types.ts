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
  createdAt: Date;
};

export type ScheduledWorkoutEntry = ScheduledWorkoutDoc & { id: string };
