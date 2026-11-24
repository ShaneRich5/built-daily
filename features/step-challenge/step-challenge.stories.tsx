import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { DEFAULT_CHALLENGE_RULE } from "@/lib/challenge-types";
import { LogStepsSheet } from "@/features/step-challenge/log-steps-sheet";
import { StartChallengeSheet } from "@/features/step-challenge/start-challenge-sheet";
import { StepChallengeCard } from "@/features/step-challenge/step-challenge-card";
import { buildLogStepsDay } from "@/features/step-challenge/step-challenge-model";
import {
  TODAY,
  cardView,
  challenge,
  daysHit,
  finishedWeek,
  stepWeek,
  syncedWeek,
  typedWeek,
} from "@/features/step-challenge/story-fixtures";

const noop = () => {};
const save = async () => true;

const meta = {
  title: "Home/Step challenge",
  component: StepChallengeCard,
  args: {
    view: cardView(challenge(daysHit), typedWeek),
    onStart: noop,
    onLogDay: noop,
    onEdit: noop,
    onRepeat: noop,
  },
  parameters: {
    docs: {
      description: {
        component:
          "Personal weekly step challenge on Home, under the week. Shown while a challenge runs or for a few days after it ends; otherwise a quiet entry point. Tap any past day to edit it. No red: a missed day is grey. Blue only marks synced numbers.",
      },
    },
  },
} satisfies Meta<typeof StepChallengeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = {
  name: "Not started",
  args: { view: null },
};

export const InProgress: Story = {
  name: "In progress (typed in)",
};

export const SyncedDay: Story = {
  name: "Synced day (Apple Health)",
  args: { view: cardView(challenge(daysHit), syncedWeek) },
};

export const Finished: Story = {
  name: "Finished (same again next week)",
  args: { view: cardView(challenge(daysHit), finishedWeek, "2026-11-27") },
};

export const FinishedNextWeekSet: Story = {
  name: "Finished, next week already set",
  args: {
    view: cardView(
      challenge(daysHit),
      finishedWeek,
      "2026-11-27",
      challenge(daysHit, "2026-11-29"),
    ),
  },
};

export const EndedShort: Story = {
  name: "Last week fell short (shown Sun–Tue)",
  args: {
    view: cardView(
      challenge(daysHit),
      stepWeek([
        { manual: 8000 },
        null,
        { apple_health: 7200 },
        { apple_health: 9100 },
        null,
        null,
        { manual: 4000 },
      ]),
      "2026-11-30",
    ),
  },
};

export const TotalRule: Story = {
  name: "Total rule (50,000 this week)",
  args: {
    view: cardView(challenge({ kind: "total", target: 50000 }), syncedWeek),
  },
};

export const StreakRule: Story = {
  name: "Streak rule (6,000 a day, 7 days)",
  args: {
    view: cardView(
      challenge({ kind: "streak", dailyTarget: 6000, length: 7 }),
      syncedWeek,
    ),
  },
};

function Reopen({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="m-4 h-11 rounded-lg border border-zinc-200 px-4 text-sm font-medium"
    >
      Open again
    </button>
  );
}

export const StartSheet: Story = {
  name: "Start sheet",
  parameters: { frame: "none" },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <StartChallengeSheet
          open={open}
          onOpenChange={setOpen}
          mode="start"
          initialRule={DEFAULT_CHALLENGE_RULE}
          onSubmit={save}
        />
      </>
    );
  },
};

export const EditSheet: Story = {
  name: "Start sheet (changing a running challenge)",
  parameters: { frame: "none" },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <StartChallengeSheet
          open={open}
          onOpenChange={setOpen}
          mode="edit"
          initialRule={{ kind: "days_hit", dailyTarget: 8000, daysNeeded: 4 }}
          onSubmit={save}
        />
      </>
    );
  },
};

function LogSheetStory({
  days,
  initialKey,
}: {
  days: ReturnType<typeof stepWeek>;
  initialKey: string;
}) {
  const [open, setOpen] = useState(true);
  const [dateKey, setDateKey] = useState(initialKey);
  const view = cardView(challenge(daysHit), days);
  return (
    <>
      <Reopen onClick={() => setOpen(true)} />
      <LogStepsSheet
        open={open}
        onOpenChange={setOpen}
        week={view.days}
        day={buildLogStepsDay(dateKey, days)}
        onPickDay={setDateKey}
        onSave={save}
        onUseSynced={save}
      />
    </>
  );
}

export const LogSheet: Story = {
  name: "Log steps sheet",
  parameters: { frame: "none" },
  render: () => <LogSheetStory days={typedWeek} initialKey={TODAY} />,
};

export const LogSheetSynced: Story = {
  name: "Log steps sheet (synced day)",
  parameters: { frame: "none" },
  render: () => <LogSheetStory days={syncedWeek} initialKey={TODAY} />,
};

export const LogSheetOverridden: Story = {
  name: "Log steps sheet (typed over a sync)",
  parameters: { frame: "none" },
  render: () => (
    <LogSheetStory
      days={stepWeek([
        { apple_health: 8214 },
        { manual: 9000, apple_health: 6900 },
        { apple_health: 4120 },
      ])}
      initialKey="2026-11-23"
    />
  ),
};
