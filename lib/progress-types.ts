/** Progress dashboard domain types (settings, body weight, insights). */

export const WEEKLY_GOAL_OPTIONS = [2, 3, 4, 5, 6, 7] as const;
export type WeeklyGoalTarget = (typeof WEEKLY_GOAL_OPTIONS)[number];

/** 7 = daily (every calendar day that week). */
export type ProgressSettingsDoc = {
  weeklyGoal: WeeklyGoalTarget;
  goalWeightLbs: number | null;
  updatedAt: Date;
};

export type BodyWeightEntryDoc = {
  dateKey: string;
  weightLbs: number;
  createdAt: Date;
};

export type SavedBodyWeightEntry = {
  id: string;
  entry: BodyWeightEntryDoc;
};

export const DEFAULT_PROGRESS_SETTINGS: ProgressSettingsDoc = {
  weeklyGoal: 3,
  goalWeightLbs: null,
  updatedAt: new Date(0),
};

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "cardio"
  | "other";

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1Rm: number;
  dateKey: string;
  sessionId: string;
  /** True when this set set a new e1RM PR at the time it was logged. */
  isNewPr: boolean;
};

export type DayWorkoutSummary = {
  sessionId: string;
  title: string;
  durationSec: number | null;
  volumeLbs: number;
  prs: Array<{ exerciseName: string; weight: number; reps: number }>;
};

export type DayActivityDetail = {
  dateKey: string;
  workouts: DayWorkoutSummary[];
  totalVolumeLbs: number;
  totalDurationSec: number;
  hasPr: boolean;
};

export type WeekGoalStatus = {
  /** Monday date key of the week (local). */
  weekStartKey: string;
  target: WeeklyGoalTarget;
  completed: number;
  met: boolean;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  achievedAtKey: string | null;
  achieved: boolean;
};
