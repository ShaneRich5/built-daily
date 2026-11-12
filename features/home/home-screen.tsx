"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { LogActivitySheet } from "@/components/log-activity-sheet";
import { moveScheduledWorkouts, updateScheduledWorkout } from "@/lib/planner-repository";
import { AccountMenu } from "@/features/home/account-menu";
import { MoveSheet } from "@/features/planner/move-sheet";
import { HomeHeader, HomeView } from "@/features/home/home-view";
import { useHomeData } from "@/features/home/use-home-data";
import { useTogetherToday } from "@/features/home/use-together-today";

/**
 * Home wired to Firestore. Signed out, it's a short pitch and a sign-in link.
 * `startRedesign` comes from the `home-start-redesign` flag, evaluated on the server.
 */
export function HomeScreen({ startRedesign }: { startRedesign: boolean }) {
  const { user, loading, firebaseReady, signOutUser } = useAuth();
  const home = useHomeData();
  const [logOpen, setLogOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [catchUpBusy, setCatchUpBusy] = useState(false);
  const together = useTogetherToday(home.together, user?.uid ?? null);

  if (!firebaseReady) {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <HomeHeader todayKey={home.todayKey} account={null} />
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800">
          Add Firebase env vars to enable sign-in.
        </p>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <HomeHeader
          todayKey={home.todayKey}
          account={
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Sign in
            </Link>
          }
        />
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-[17px] font-semibold">A workout journal that keeps you showing up</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Log workouts in a few taps, reuse templates, and see your week at a glance.
          </p>
          <Link
            href="/login"
            className="mt-4 flex h-12 items-center justify-center rounded-xl bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800"
          >
            Sign in to start
          </Link>
        </section>
      </div>
    );
  }

  const runCatchUp = async (write: () => Promise<boolean>) => {
    setCatchUpBusy(true);
    try {
      if (!(await write())) throw new Error("not saved");
    } catch {
      window.alert("Couldn’t update your plan. Check your connection and try again.");
    } finally {
      setCatchUpBusy(false);
    }
  };
  const missed = home.missed;

  return (
    <>
      <HomeView
        {...home}
        together={together}
        startRedesign={startRedesign}
        loaded={home.loaded}
        account={
          <AccountMenu email={user?.email ?? null} onSignOut={() => void signOutUser()} />
        }
        onLogActivity={() => setLogOpen(true)}
        catchUp={
          missed
            ? {
                missed,
                busy: catchUpBusy,
                onDoToday: () =>
                  void runCatchUp(() => moveScheduledWorkouts([{ id: missed.id, dateKey: home.todayKey }])),
                onPickDay: () => setMoveOpen(true),
                onSkip: () => void runCatchUp(() => updateScheduledWorkout(missed.id, { status: "skipped" })),
              }
            : null
        }
      />
      <MoveSheet
        open={moveOpen}
        onOpenChange={setMoveOpen}
        card={missed}
        todayKey={home.todayKey}
        movable={home.movable}
      />
      <LogActivitySheet open={logOpen} onClose={() => setLogOpen(false)} />
    </>
  );
}
