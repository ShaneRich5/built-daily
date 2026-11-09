import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TemplateEditor } from "@/features/templates/template-editor";

/** Saving is a no-op in Storybook (no signed-in user). */
const meta = {
  title: "Templates/Editor",
  component: TemplateEditor,
} satisfies Meta<typeof TemplateEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewTemplate: Story = { args: { planId: null, initialPlan: null } };

export const EditTemplate: Story = {
  args: {
    planId: "push",
    initialPlan: {
      name: "Push day",
      createdAt: new Date(),
      updatedAt: new Date(),
      source: "custom",
      lines: [
        { lineId: "1", exerciseId: "bench", nameSnapshot: "Barbell bench press", metric: "weight_reps", targetSets: 3 },
        { lineId: "2", exerciseId: "incline-db", nameSnapshot: "Dumbbell incline press", metric: "weight_reps", targetSets: 3, notes: "Bench at 30°" },
        { lineId: "3", exerciseId: "cable-fly", nameSnapshot: "Cable chest fly", metric: "weight_reps", targetSets: 4 },
        { lineId: "4", exerciseId: "cable-tricep-pushdown", nameSnapshot: "Cable triceps pushdown", metric: "weight_reps", targetSets: 4 },
      ],
    },
  },
};
