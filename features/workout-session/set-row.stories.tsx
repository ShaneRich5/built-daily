import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { quickFieldsForMetric } from "@/features/workout-session/session-model";
import { QuickSetRow } from "@/features/workout-session/set-row";
import { row } from "@/features/workout-session/story-fixtures";
import type { ExerciseMetric } from "@/lib/exercise-catalog";
import type { SetRow } from "@/features/workout-session/session-model";

function Playground({
  metric,
  initial,
  suggestion,
}: {
  metric: ExerciseMetric;
  initial: SetRow;
  suggestion: SetRow | null;
}) {
  const [set, setSet] = useState(initial);
  return (
    <QuickSetRow
      setNumber={1}
      set={set}
      fields={quickFieldsForMetric(metric)}
      suggestion={suggestion}
      onChange={(patch) => setSet((s) => ({ ...s, ...patch }))}
      onToggleDone={() => setSet((s) => ({ ...s, done: !s.done }))}
    />
  );
}

const meta = {
  title: "Workout session/Set row",
  component: Playground,
  argTypes: {
    metric: {
      control: "inline-radio",
      options: ["weight_reps", "bodyweight_reps", "duration", "cardio"],
    },
  },
} satisfies Meta<typeof Playground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyWithSuggestion: Story = {
  name: "Empty · shows last time greyed out",
  args: { metric: "weight_reps", initial: row(), suggestion: row({ weight: "30", reps: "12" }) },
};

export const Filled: Story = {
  args: { metric: "weight_reps", initial: row({ weight: "135", reps: "8" }), suggestion: null },
};

export const Done: Story = {
  args: {
    metric: "weight_reps",
    initial: row({ weight: "135", reps: "8", done: true }),
    suggestion: null,
  },
};

export const Cardio: Story = {
  args: { metric: "cardio", initial: row(), suggestion: row({ seconds: "1200", distanceMiles: "2" }) },
};
