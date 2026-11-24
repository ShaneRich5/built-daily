"use client";

import { useState } from "react";
import {
  addDaysToDateKey,
  endOfWeekDateKey,
  startOfWeekDateKey,
} from "@/lib/calendar-views";
import {
  startChallenge,
  updateChallengeRule,
} from "@/lib/challenge-repository";
import {
  DEFAULT_CHALLENGE_RULE,
  type ChallengeRule,
} from "@/lib/challenge-types";
import { setManualDailyMetric } from "@/lib/daily-metric-repository";
import { LogStepsSheet } from "@/features/step-challenge/log-steps-sheet";
import { StartChallengeSheet } from "@/features/step-challenge/start-challenge-sheet";
import { StepChallengeCard } from "@/features/step-challenge/step-challenge-card";
import {
  buildLogStepsDay,
  repeatStartDate,
} from "@/features/step-challenge/step-challenge-model";
import { useStepChallenge } from "@/features/step-challenge/use-step-challenge";

/**
 * Writes go to the offline cache first and show up through the live
 * subscription right away, so sheets close without waiting on the network
 * (the same way sessions save). A rejected write (no signal for good, or a
 * rule check) is reported once it comes back.
 */
function inBackground(write: Promise<unknown>) {
  write.catch(() => {
    window.alert("Couldn’t save that. Check your connection and try again.");
  });
}

/** The step challenge card on Home, wired to Firestore, with its two sheets. */
export function StepChallengeSection({ todayKey }: { todayKey: string }) {
  const { loaded, shown, view, days } = useStepChallenge(todayKey);
  const [sheet, setSheet] = useState<"start" | "edit" | "log" | null>(null);
  const [logKey, setLogKey] = useState(todayKey);

  // Avoids flashing "Start a step challenge" before a running one loads.
  if (!loaded) return null;

  const startThisWeek = (rule: ChallengeRule) =>
    startChallenge({
      metric: "steps",
      rule,
      startDate: startOfWeekDateKey(todayKey),
      endDate: endOfWeekDateKey(todayKey),
    });

  const submitRule = async (rule: ChallengeRule) => {
    inBackground(
      sheet === "edit" && shown
        ? updateChallengeRule(shown.id, rule)
        : startThisWeek(rule),
    );
    setSheet(null);
    return true;
  };

  const repeat = () => {
    if (!shown) return;
    const startDate = repeatStartDate(shown, todayKey);
    inBackground(
      startChallenge({
        metric: shown.challenge.metric,
        rule: shown.challenge.rule,
        startDate,
        endDate: addDaysToDateKey(startDate, 6),
      }),
    );
  };

  return (
    <>
      <StepChallengeCard
        view={view}
        onStart={() => setSheet("start")}
        // A week that's over starts a fresh one; otherwise edit the running one.
        onEdit={() => setSheet(view?.state === "ended" ? "start" : "edit")}
        onRepeat={repeat}
        onLogDay={(dateKey) => {
          setLogKey(dateKey);
          setSheet("log");
        }}
      />
      <StartChallengeSheet
        open={sheet === "start" || sheet === "edit"}
        onOpenChange={(open) => !open && setSheet(null)}
        mode={sheet === "edit" ? "edit" : "start"}
        initialRule={view?.rule ?? DEFAULT_CHALLENGE_RULE}
        onSubmit={submitRule}
      />
      {view ? (
        <LogStepsSheet
          open={sheet === "log"}
          onOpenChange={(open) => !open && setSheet(null)}
          week={view.days}
          day={buildLogStepsDay(logKey, days)}
          onPickDay={setLogKey}
          onSave={async (dateKey, steps) => {
            inBackground(setManualDailyMetric(dateKey, "steps", steps));
            setSheet(null);
            return true;
          }}
          onUseSynced={async (dateKey) => {
            inBackground(setManualDailyMetric(dateKey, "steps", null));
            setSheet(null);
            return true;
          }}
        />
      ) : null}
    </>
  );
}
