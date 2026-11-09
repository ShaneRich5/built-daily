import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { DEFAULT_PROGRESS_SETTINGS, type SavedBodyWeightEntry } from "@/lib/progress-types";
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
  args: {
    todayKey: TODAY,
    week: { weekStartKey: "2026-11-08", target: 3, completed: 1, met: false },
    momentum: {
      status: "on_track",
      title: "On track · 4-week run",
      detail: "2 workouts left · 4 days including today.",
      bankedStreak: 4,
      remainingWorkouts: 2,
      daysLeft: 4,
    },
    movementWeek: { weekStartKey: "2026-11-08", target: 5, completed: 2, met: false },
    goalStreak: { current: 4, longest: 6 },
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

export const MidWeek: Story = { name: "Mid-week, on track" };

export const NewUser: Story = {
  name: "New user",
  args: {
    week: { weekStartKey: "2026-11-08", target: 3, completed: 0, met: false },
    momentum: {
      status: "starting",
      title: "Fresh week",
      detail: "3 workouts this week keeps you consistent. No pressure to go every day.",
      bankedStreak: 0,
      remainingWorkouts: 3,
      daysLeft: 4,
    },
    movementWeek: { weekStartKey: "2026-11-08", target: 5, completed: 0, met: false },
    goalStreak: { current: 0, longest: 0 },
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
