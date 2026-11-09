import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AddExerciseFooter } from "@/features/workout-session/add-exercise-footer";
import { SessionActionBar } from "@/features/workout-session/session-action-bar";
import { SessionHeader } from "@/features/workout-session/session-header";
import { catalog, pushDay, suggested } from "@/features/workout-session/story-fixtures";
import { WorkoutSessionScreen } from "@/features/workout-session/workout-session-screen";

/**
 * The whole active-workout screen, fully interactive (nothing is saved —
 * there is no signed-in user in Storybook).
 */
const meta = {
  title: "Workout session/Screen",
  component: WorkoutSessionScreen,
  parameters: {
    docs: {
      description: {
        component:
          "Quick cards for logging, new exercises added at the bottom with \"Usually next\" picks, and sheets for search, details, move, reorder and workout details.",
      },
    },
  },
} satisfies Meta<typeof WorkoutSessionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { title: "", titleIsCustom: false, exercises: [] },
};

export const MidWorkout: Story = {
  name: "Mid-workout",
  args: {
    title: "Push day",
    exercises: pushDay.map((item) => item.exercise),
    initialLineIds: pushDay.map((item) => item.lineId),
    initialSetsByExercise: pushDay.map((item) => item.sets),
  },
};

export const FromTemplate: Story = {
  name: "Just started from a template",
  args: {
    title: "Leg day",
    exercises: [catalog("squat"), catalog("rdl"), catalog("lunge")],
  },
};

export const Header: StoryObj<typeof SessionHeader> = {
  render: () => (
    <SessionHeader
      title="Push day"
      exerciseCount={4}
      setCount={12}
      doneSetCount={8}
      onOpenWorkoutDetails={() => {}}
    />
  ),
};

export const AddFooter: StoryObj<typeof AddExerciseFooter> = {
  name: "Add exercise + Usually next",
  render: () => (
    <AddExerciseFooter
      suggestions={suggested}
      isFirst={false}
      atLimit={false}
      onOpenSearch={() => {}}
      onAddSuggestion={() => {}}
    />
  ),
};

export const ActionBar: StoryObj<typeof SessionActionBar> = {
  render: () => (
    <SessionActionBar
      hasExercises
      canAdd
      journalCopied={false}
      onAddExercise={() => {}}
      onFinish={() => {}}
      onOpenWorkoutDetails={() => {}}
      onReorder={() => {}}
      onCopyJournal={() => {}}
      onDownloadJournal={() => {}}
      onDelete={() => {}}
    />
  ),
};
