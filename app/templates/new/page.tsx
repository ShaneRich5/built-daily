import type { Metadata } from "next";
import { TemplateEditor } from "@/features/templates/template-editor";

export const metadata: Metadata = {
  title: "New workout",
};

export default function NewTemplatePage() {
  return <TemplateEditor planId={null} initialPlan={null} />;
}
