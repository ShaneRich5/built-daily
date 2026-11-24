"use client";

import { useState } from "react";
import {
  startChallenge,
  updateChallengeRule,
} from "@/lib/challenge-repository";
import {
  DEFAULT_CHALLENGE_RULE,
  type ChallengePeriod,
  type ChallengeRule,
} from "@/lib/challenge-types";
import { setManualDailyMetric } from "@/lib/daily-metric-repository";
import { LogStepsSheet } from "@/features/step-challenge/log-steps-sheet";
import { StartChallengeSheet } from "@/features/step-challenge/start-challenge-sheet";
import { StepChallengeCard } from "@/features/step-challenge/step-challenge-card";
import {
  buildLogStepsDay,
  challengeRange,
  repeatRange,
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

  /** Covers the whole week or month containing today, so steps already in it count. */
  const startNow = (rule: ChallengeRule, period: ChallengePeriod) =>
    startChallenge({
      metric: "steps",
      rule,
      period,
      ...challengeRange(period, todayKey),
    });

  const submitRule = async (rule: ChallengeRule, period: ChallengePeriod) => {
    inBackground(
      sheet === "edit" && shown
        ? updateChallengeRule(shown.id, rule)
        : startNow(rule, period),
    );
    setSheet(null);
    return true;
  };

  const repeat = () => {
    if (!shown) return;
    inBackground(
      startChallenge({
        metric: shown.challenge.metric,
        rule: shown.challenge.rule,
        period: shown.challenge.period,
        ...repeatRange(shown, todayKey),
      }),
    );
  };

  return (
    <>
      <StepChallengeCard
        view={view}
        onStart={() => setSheet("start")}
        // A challenge that's over starts a fresh one; otherwise edit the running one.
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
        todayKey={todayKey}
        initialRule={view?.rule ?? DEFAULT_CHALLENGE_RULE}
        initialPeriod={view?.period ?? "week"}
        onSubmit={submitRule}
      />
      {view ? (
        <LogStepsSheet
          open={sheet === "log"}
          onOpenChange={(open) => !open && setSheet(null)}
          period={view.period}
          days={view.days}
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
