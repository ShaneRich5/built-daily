import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { DEFAULT_PROGRESS_SETTINGS, type SavedBodyWeightEntry } from "@/lib/progress-types";
import type { SavedActivity } from "@/lib/activity-types";
import type { SessionSummary } from "@/lib/workout-session-repository";
import { buildHomeConsistency, buildHomeWeek } from "@/features/home/home-model";
import { GoalsSheet } from "@/features/progress/goals-sheet";
import { ProgressView } from "@/features/progress/progress-view";

const TODAY = "2026-11-11";

/** Three workouts most weeks for the last four months, plus a few walks. */
function sampleActivity() {
  const workouts = new Map<string, number>();
  const walks = new Map<string, number>();
  for (let i = 1; i < 120; i++) {
    const key = addDaysToDateKey(TODAY, -i);
    const dow = new Date(`${key}T12:00:00`).getDay();
    if ((dow === 1 || dow === 4 || dow === 6) && i % 11 !== 0) workouts.set(key, 1);
    else if (dow === 3 && i % 2 === 0) walks.set(key, 1);
  }
  workouts.set("2026-11-09", 1);
  return { workouts, walks };
}

const { workouts, walks } = sampleActivity();

const WORKOUT_NAMES = ["Push day", "Pull day", "Leg day"];

/** The same sample days as the heatmap, as the sessions and activities Home's card is built from. */
const summaries: SessionSummary[] = [...workouts.keys()].map((dateKey, i) => ({
  id: `s-${dateKey}`,
  status: "completed",
  workoutDate: dateKey,
  workoutTime: "07:00",
  title: WORKOUT_NAMES[i % WORKOUT_NAMES.length]!,
  planId: null,
  startedAt: new Date(`${dateKey}T07:00:00`),
  endedAt: new Date(`${dateKey}T08:00:00`),
  exerciseCount: 5,
  setCount: 16,
  previewExerciseNames: [],
}));

const walkActivities: SavedActivity[] = [...walks.keys()].map((dateKey) => ({
  id: `a-${dateKey}`,
  activity: {
    activityTypeId: "walk",
    activityDate: dateKey,
    activityTime: "18:00",
    durationMin: 35,
    distanceMiles: 1.8,
    locationName: null,
    notes: null,
    visibility: "private",
    source: "manual",
    startedAt: null,
    endedAt: null,
    createdAt: new Date(`${dateKey}T18:00:00`),
    updatedAt: new Date(`${dateKey}T18:00:00`),
  },
}));

const weights: SavedBodyWeightEntry[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  entry: {
    dateKey: addDaysToDateKey(TODAY, -33 + i * 3),
    weightLbs: Math.round((184 - i * 0.15 + (i % 3) * 0.3) * 10) / 10,
    createdAt: new Date(),
  },
}));

const lift = (exerciseId: string, exerciseName: string, weight: number, reps: number, dateKey: string) => ({
  exerciseId,
  exerciseName,
  weight,
  reps,
  estimated1Rm: weight * (1 + reps / 30),
  dateKey,
  sessionId: "s",
  isNewPr: true,
});

const meta = {
  title: "Progress/Screen",
  component: ProgressView,
  argTypes: {
    redesign: {
      control: "boolean",
      description: "The `progress-redesign` flag (Vercel Flags) on the real page: on = new design, off = old.",
    },
  },
  args: {
    todayKey: TODAY,
    redesign: true,
    momentum: {
      status: "on_track",
      title: "On track · 4-week run",
      detail: "2 workouts left · 4 days including today.",
      bankedStreak: 4,
      remainingWorkouts: 2,
      daysLeft: 4,
    },
    goalStreak: { current: 4, longest: 6 },
    week: { weekStartKey: "2026-11-08", target: 3, completed: 1, met: false },
    movementWeek: { weekStartKey: "2026-11-08", target: 5, completed: 2, met: false },
    weekDays: buildHomeWeek(TODAY, summaries, walkActivities, []),
    consistency: buildHomeConsistency(TODAY, summaries, walkActivities, [], 3),
    heatmap: { activity: workouts, activityByDay: walks, dayDetails: new Map() },
    lifts: [
      lift("bench", "Barbell bench press", 145, 6, "2026-11-05"),
      lift("squat", "Barbell back squat", 205, 5, "2026-11-02"),
      lift("deadlift", "Conventional deadlift", 245, 5, "2026-10-24"),
    ],
    weights,
    goalWeightLbs: 178,
    milestones: [
      { id: "first", title: "First workout", description: "", achievedAtKey: "2026-07-01", achieved: true },
      { id: "ten", title: "10 workouts", description: "", achievedAtKey: "2026-08-01", achieved: true },
      { id: "fifty", title: "50 workouts", description: "", achievedAtKey: null, achieved: false },
    ],
    onOpenGoals: () => {},
    onLogWeight: async () => {},
  },
} satisfies Meta<typeof ProgressView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MidWeek: Story = { name: "Mid-week · new design (flag on)" };

export const OldDesign: Story = {
  name: "Mid-week · old design (flag off)",
  args: { redesign: false },
};

export const NewUser: Story = {
  name: "New user",
  args: {
    week: { weekStartKey: "2026-11-08", target: 3, completed: 0, met: false },
    movementWeek: { weekStartKey: "2026-11-08", target: 5, completed: 0, met: false },
    weekDays: buildHomeWeek(TODAY, [], [], []),
    consistency: buildHomeConsistency(TODAY, [], [], [], 3),
    heatmap: { activity: new Map(), activityByDay: new Map(), dayDetails: new Map() },
    lifts: [],
    weights: [],
    goalWeightLbs: null,
    milestones: [{ id: "first", title: "First workout", description: "", achievedAtKey: null, achieved: false }],
  },
};

export const Goals: StoryObj<typeof GoalsSheet> = {
  name: "Goals (sheet)",
  parameters: { frame: "none" },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="m-4 h-11 rounded-lg border px-4 text-sm">
          Open again
        </button>
        <GoalsSheet
          open={open}
          onOpenChange={setOpen}
          settings={{ ...DEFAULT_PROGRESS_SETTINGS, goalWeightLbs: 178 }}
          onSave={async () => true}
        />
      </>
    );
  },
};
