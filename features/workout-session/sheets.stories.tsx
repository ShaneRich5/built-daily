import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { ExerciseDetailsSheet } from "@/features/workout-session/exercise-details-sheet";
import { ExerciseSearchSheet } from "@/features/workout-session/exercise-search-sheet";
import { MoveExerciseSheet } from "@/features/workout-session/move-exercise-sheet";
import { ReorderSheet } from "@/features/workout-session/reorder-sheet";
import { flyHistory, pushDay, suggested } from "@/features/workout-session/story-fixtures";
import { WorkoutDetailsSheet } from "@/features/workout-session/workout-details-sheet";

/**
 * The sheets open from the session screen. Each story renders one open; close
 * it and use the button to bring it back.
 */
const meta = {
  title: "Workout session/Sheets",
  parameters: { frame: "none" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Reopen({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="m-4 h-11 rounded-lg border border-zinc-200 px-4 text-sm font-medium"
    >
      Open again
    </button>
  );
}

export const AddExercises: Story = {
  name: "Search & add (multi-pick)",
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <ExerciseSearchSheet
          open={open}
          onOpenChange={setOpen}
          mode={{ kind: "add", afterName: "Cable chest fly", room: 36 }}
          suggested={suggested}
          recent={suggested}
          onAdd={(picked) => {
            alert(`Add: ${picked.map((p) => p.name).join(", ")}`);
            setOpen(false);
          }}
          onReplace={() => {}}
        />
      </>
    );
  },
};

export const ChangeExercise: Story = {
  name: "Search · change exercise",
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <ExerciseSearchSheet
          open={open}
          onOpenChange={setOpen}
          mode={{ kind: "replace", currentName: "Cable chest fly" }}
          suggested={suggested}
          recent={[]}
          onAdd={() => {}}
          onReplace={(exercise) => {
            alert(`Replace with ${exercise.name}`);
            setOpen(false);
          }}
        />
      </>
    );
  },
};

export const ExerciseDetails: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [item, setItem] = useState(pushDay[2]!);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <ExerciseDetailsSheet
          open={open}
          onOpenChange={setOpen}
          item={item}
          position={3}
          total={4}
          history={flyHistory}
          historyLoading={false}
          onUpdateSet={(setIndex, patch) =>
            setItem((it) => ({
              ...it,
              sets: it.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)),
            }))
          }
          onAddSet={() => {}}
          onCopyLastSet={() => {}}
          onRemoveSet={() => {}}
          onUseHistory={() => {}}
          onNoteChange={(note) => setItem((it) => ({ ...it, note }))}
          onChangeExercise={() => {}}
          onMoveExercise={() => {}}
          onRemoveExercise={() => {}}
        />
      </>
    );
  },
};

export const MoveTo: Story = {
  name: "Move to… (one tap)",
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <MoveExerciseSheet
          open={open}
          onOpenChange={setOpen}
          exercises={pushDay}
          lineId="lateral"
          onMove={(_, to) => alert(`Move to position ${to + 1}`)}
        />
      </>
    );
  },
};

export const Reorder: Story = {
  name: "Reorder (drag or arrows)",
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [items, setItems] = useState(pushDay);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <ReorderSheet
          open={open}
          onOpenChange={setOpen}
          exercises={items}
          onMove={(lineId, toIndex) =>
            setItems((prev) => {
              const from = prev.findIndex((i) => i.lineId === lineId);
              const to = Math.max(0, Math.min(prev.length - 1, toIndex));
              const next = [...prev];
              const [moved] = next.splice(from, 1);
              next.splice(to, 0, moved!);
              return next;
            })
          }
        />
      </>
    );
  },
};

export const WorkoutDetails: Story = {
  name: "Workout details (name, date, note)",
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [meta, setMeta] = useState({
      title: "Push day",
      workoutDate: "2026-11-08",
      workoutTime: "18:10",
      workoutNote: "",
    });
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <WorkoutDetailsSheet
          open={open}
          onOpenChange={setOpen}
          state={meta}
          startedAtMs={Date.now()}
          exercises={pushDay.map((i) => i.exercise)}
          onMetaChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
        />
      </>
    );
  },
};
