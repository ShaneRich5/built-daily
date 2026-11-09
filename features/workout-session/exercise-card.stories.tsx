import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useReducer } from "react";
import { ExerciseCard } from "@/features/workout-session/exercise-card";
import type { SessionExercise } from "@/features/workout-session/session-model";
import { sessionReducer } from "@/features/workout-session/session-reducer";
import {
  lastTimeFly,
  pushDay,
  row,
  sessionExercise,
} from "@/features/workout-session/story-fixtures";
import type { SetLog } from "@/lib/workout-types";

/** Wires the card to the real session reducer so you can tap through it. */
function InteractiveCard({
  item,
  open: initiallyOpen,
  lastTimeSets,
  hasNextExercise = true,
}: {
  item: SessionExercise;
  open: boolean;
  lastTimeSets?: SetLog[];
  hasNextExercise?: boolean;
}) {
  const [state, dispatch] = useReducer(sessionReducer, {
    title: "",
    workoutDate: "",
    workoutTime: "",
    workoutNote: "",
    exercises: [item],
    openLineId: initiallyOpen ? item.lineId : null,
  });
  const current = state.exercises[0]!;
  const lineId = current.lineId;
  return (
    <ExerciseCard
      item={current}
      open={state.openLineId === lineId}
      lastTimeSets={lastTimeSets}
      hasNextExercise={hasNextExercise}
      onToggleOpen={() =>
        dispatch({ type: "openExercise", lineId: state.openLineId ? null : lineId })
      }
      onOpenDetails={() => alert("Opens the details screen")}
      onUpdateSet={(setIndex, patch) => dispatch({ type: "updateSet", lineId, setIndex, patch })}
      onToggleSetDone={(setIndex, suggestion) =>
        dispatch({ type: "toggleSetDone", lineId, setIndex, suggestion })
      }
      onAddSet={() => dispatch({ type: "addSet", lineId })}
      onCopyLastSet={() => dispatch({ type: "copyLastSet", lineId })}
      onNextExercise={() => dispatch({ type: "openExercise", lineId: null })}
    />
  );
}

const meta = {
  title: "Workout session/Exercise card",
  component: InteractiveCard,
  parameters: {
    docs: {
      description: {
        component:
          "One exercise in the active workout. Closed, it is a single line with a status ring. Open, it is the quick set logger: empty sets show last time's numbers greyed out, and checking an empty set fills them in.",
      },
    },
  },
} satisfies Meta<typeof InteractiveCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = {
  args: { item: pushDay[3]!, open: false, lastTimeSets: lastTimeFly },
};

export const InProgress: Story = {
  args: { item: pushDay[2]!, open: false },
};

export const Done: Story = {
  args: { item: pushDay[0]!, open: false },
};

export const OpenWithLastTime: Story = {
  name: "Open · last time as suggestions",
  args: { item: pushDay[2]!, open: true, lastTimeSets: lastTimeFly },
};

export const OpenFirstTime: Story = {
  name: "Open · first time doing it",
  args: { item: sessionExercise("new", "cable-fly", [row()]), open: true },
};

export const OpenAllDone: Story = {
  name: "Open · all sets done",
  args: { item: pushDay[1]!, open: true },
};

export const Bodyweight: Story = {
  args: {
    item: sessionExercise("pullup", "pullup", [row({ reps: "8", done: true }), row()]),
    open: true,
  },
};

export const HoldTime: Story = {
  args: {
    item: sessionExercise("plank", "plank", [row({ seconds: "60", done: true }), row()]),
    open: true,
  },
};

export const WithNote: Story = {
  args: {
    item: sessionExercise("fly", "cable-fly", pushDay[2]!.sets, "Low pulleys taken"),
    open: false,
  },
};
