import { Suspense } from "react";
import { ActiveWorkoutFromUrl } from "@/components/active-workout-from-url";

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <p className="py-4 text-sm text-zinc-500">Preparing your session…</p>
      }
    >
      <ActiveWorkoutFromUrl />
    </Suspense>
  );
}
