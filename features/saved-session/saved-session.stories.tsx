import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { SavedSessionSummary } from "@/features/saved-session/saved-session-model";
import { SavedSessionView } from "@/features/saved-session/saved-session-view";
import { pushDay } from "@/features/workout-session/story-fixtures";
import { WorkoutSessionScreen } from "@/features/workout-session/workout-session-screen";

const summary: SavedSessionSummary = {
  title: "Push day",
  when: "Thu, Nov 5, 2026 · 6:10 PM",
  note: "Felt strong today. Left shoulder fine on the incline.",
  stats: [
    { label: "Exercises", value: "4" },
    { label: "Sets", value: "14" },
  ],
  muscles: "Chest · shoulders · arms",
  exercises: [
    { lineId: "a", name: "Barbell bench press", sets: ["135 lb × 8", "145 lb × 6", "145 lb × 6"], note: null },
    {
      lineId: "b",
      name: "Dumbbell incline press",
      sets: ["50 lb × 10", "50 lb × 9", "50 lb × 8"],
      note: "Shoulder fine at this angle.",
    },
    { lineId: "c", name: "Cable chest fly", sets: ["30 lb × 12", "30 lb × 12", "30 lb × 12", "35 lb × 10"], note: null },
    { lineId: "d", name: "Cable triceps pushdown", sets: ["50 lb × 12", "50 lb × 12", "55 lb × 10", "55 lb × 9"], note: null },
  ],
};

const noop = () => {};

const meta = {
  title: "Saved session/Screen",
  component: SavedSessionView,
  args: {
    summary,
    exercises: pushDay.map((item) => item.exercise),
    backHref: "/",
    journalCopied: false,
    error: null,
    busy: false,
    onEdit: noop,
    onReopen: noop,
    onSaveAsTemplate: noop,
    onCopyJournal: noop,
    onDownloadJournal: noop,
    onDelete: noop,
  },
} satisfies Meta<typeof SavedSessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Read: Story = { name: "Read (default)" };

export const OlderWorkoutWithDuration: Story = {
  name: "Older workout with a timer duration",
  args: {
    summary: {
      ...summary,
      note: null,
      stats: [...summary.stats, { label: "Duration", value: "48m 12s" }],
    },
  },
};

export const NoDetails: Story = {
  name: "Logged without details",
  args: {
    summary: { ...summary, note: null, muscles: null, exercises: [], stats: [{ label: "Exercises", value: "0" }, { label: "Sets", value: "0" }] },
  },
};

export const WithError: Story = {
  name: "Action failed",
  args: { error: "Couldn’t delete this workout." },
};

export const Editing: StoryObj<typeof WorkoutSessionScreen> = {
  name: "Editing (Save changes)",
  render: () => (
    <WorkoutSessionScreen
      title="Push day"
      exercises={pushDay.map((item) => item.exercise)}
      initialLineIds={pushDay.map((item) => item.lineId)}
      initialSetsByExercise={pushDay.map((item) => item.sets)}
      editing={{ onCancel: noop }}
      onFinish={noop}
    />
  ),
};
