import type { Metadata } from "next";
import { WorkoutTemplateEditor } from "@/components/workout-template-editor";

export const metadata: Metadata = {
  title: "New workout",
};

export default function NewTemplatePage() {
  return <WorkoutTemplateEditor planId={null} initialPlan={null} />;
}
