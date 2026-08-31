import type { Metadata } from "next";
import { ExerciseCatalogBrowser } from "@/components/exercise-catalog-browser";

export const metadata: Metadata = {
  title: "Exercise catalog",
  description:
    "Browse exercises and see which muscles they target on a body diagram.",
};

export default function CatalogPage() {
  return <ExerciseCatalogBrowser />;
}
