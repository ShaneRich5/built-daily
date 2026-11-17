import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { HistoryDeleteSheet } from "@/components/history-delete-sheet";

/** The sheet with local state, so Delete shows "Deleting…" briefly and Cancel closes it. */
function SheetDemo({ workouts, activities }: { workouts: number; activities: number }) {
  const [open, setOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="m-4 h-11 rounded-lg border px-4 text-sm">
        Open again
      </button>
      <HistoryDeleteSheet
        open={open}
        onOpenChange={setOpen}
        workouts={workouts}
        activities={activities}
        deleting={deleting}
        onConfirm={() => {
          setDeleting(true);
          window.setTimeout(() => {
            setDeleting(false);
            setOpen(false);
          }, 1200);
        }}
      />
    </>
  );
}

const meta = {
  title: "History/Delete sheet",
  component: SheetDemo,
  args: { workouts: 3, activities: 1 },
  parameters: {
    frame: "none",
    docs: {
      description: {
        component:
          "Confirms a bulk delete from History's select mode. Deleting can't be undone, so it always asks and names exactly what will go.",
      },
    },
  },
} satisfies Meta<typeof SheetDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WorkoutsAndActivity: Story = { name: "Workouts and an activity" };
export const OneWorkout: Story = { name: "One workout", args: { workouts: 1, activities: 0 } };
export const ActivitiesOnly: Story = { name: "Activities only", args: { workouts: 0, activities: 2 } };
