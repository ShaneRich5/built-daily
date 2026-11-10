"use client";

import Link from "next/link";
import { useState } from "react";
import { saveProgressSettings } from "@/lib/progress-settings-repository";
import { GoalsSheet } from "@/features/progress/goals-sheet";
import { ProgressView } from "@/features/progress/progress-view";
import { useProgressData } from "@/features/progress/use-progress-data";

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Progress</h1>
      <div className="text-sm text-zinc-500">{children}</div>
    </div>
  );
}

export function ProgressScreen() {
  const data = useProgressData();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalsKey, setGoalsKey] = useState(0);

  if (!data.firebaseReady) return <Message>Add Firebase configuration to use progress insights.</Message>;
  if (data.authLoading) return <Message>Loading…</Message>;
  if (!data.signedIn) {
    return (
      <Message>
        <Link href="/login" className="font-semibold text-zinc-900 underline dark:text-zinc-100">
          Sign in
        </Link>{" "}
        to see your consistency, strength and milestones.
      </Message>
    );
  }
  if (!data.loaded) {
    return (
      <div className="flex flex-1 flex-col gap-4" aria-busy="true" aria-label="Loading">
        <div className="h-12 w-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-52 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  return (
    <>
      <ProgressView
        todayKey={data.todayKey}
        week={data.week}
        movementWeek={data.movementWeek}
        weekDays={data.weekDays}
        consistency={data.consistency}
        heatmap={{
          activity: data.activity,
          activityByDay: data.activityByDay,
          dayDetails: data.dayDetails,
        }}
        lifts={data.lifts}
        weights={data.weights}
        goalWeightLbs={data.settings.goalWeightLbs}
        milestones={data.milestones}
        onOpenGoals={() => {
          setGoalsKey((k) => k + 1);
          setGoalsOpen(true);
        }}
      />
      <GoalsSheet
        key={goalsKey}
        open={goalsOpen}
        onOpenChange={setGoalsOpen}
        settings={data.settings}
        onSave={saveProgressSettings}
      />
    </>
  );
}
