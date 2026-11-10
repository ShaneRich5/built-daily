"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";
import { SHARED_PLAN_LIMITS, type SharedPlanExercise } from "@/lib/group-types";
import type { NewSharedPlanInput } from "@/lib/group-plan-repository";
import { nextSevenDays } from "@/features/groups/groups-model";
import { outlineButton, primaryGreen, sectionLabel } from "@/features/groups/group-ui";

export type PlanTemplateOption = { id: string; name: string; exercises: SharedPlanExercise[] };

const TIME_CHIPS = [
  { id: "any", label: "Anytime", time: null },
  { id: "early", label: "6:30 AM", time: "06:30" },
  { id: "lunch", label: "Lunch", time: "12:00" },
  { id: "evening", label: "Evening", time: "18:00" },
  { id: "custom", label: "Other time", time: null },
] as const;

type TimeChipId = (typeof TIME_CHIPS)[number]["id"];

const OTHER = "__other__";

const chip =
  "inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-medium transition";
const chipOff =
  "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";
const chipOn =
  "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900";
const input =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

export type PlanTogetherSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayKey: string;
  templates: PlanTemplateOption[];
  groups: { id: string; name: string }[];
  defaultGroupId: string;
  /** dateKey → other members already training or planning that day. */
  crewCounts: Record<string, number>;
  onSubmit: (input: NewSharedPlanInput) => Promise<boolean>;
};

/** G3: pick a workout, a day, maybe a time and place. Goes on your planner too. */
export function PlanTogetherSheet(props: PlanTogetherSheetProps) {
  // Remount the form each time it opens so it starts fresh.
  return (
    <BottomSheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Plan a workout"
      description="Goes on your planner. The group can tap I’m in."
    >
      {props.open ? <PlanTogetherForm {...props} /> : null}
    </BottomSheet>
  );
}

function PlanTogetherForm({
  onOpenChange,
  todayKey,
  templates,
  groups,
  defaultGroupId,
  crewCounts,
  onSubmit,
}: PlanTogetherSheetProps) {
  const days = nextSevenDays(todayKey);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? OTHER);
  const [otherName, setOtherName] = useState("");
  const [dateKey, setDateKey] = useState(days[0]!.dateKey);
  const [timeChip, setTimeChip] = useState<TimeChipId>("any");
  const [customTime, setCustomTime] = useState("07:00");
  const [where, setWhere] = useState("");
  const [note, setNote] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([defaultGroupId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId) ?? null;
  const label = (template ? template.name : otherName).trim();
  const day = days.find((d) => d.dateKey === dateKey)!;
  const time =
    timeChip === "custom" ? customTime || null : (TIME_CHIPS.find((c) => c.id === timeChip)?.time ?? null);
  const canSubmit = label.length > 0 && groupIds.length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await onSubmit({
        groupIds,
        dateKey,
        time,
        where: where || null,
        note: note || null,
        label,
        exercises: template?.exercises ?? [],
      });
      if (ok) onOpenChange(false);
      else setError("Couldn’t save the plan. Check your connection and try again.");
    } catch {
      setError("Couldn’t save the plan. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className={cn(sectionLabel, "mb-2")}>Workout</legend>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={templateId === t.id}
              onClick={() => setTemplateId(t.id)}
              className={cn(chip, templateId === t.id ? chipOn : chipOff)}
            >
              {t.name}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={templateId === OTHER}
            onClick={() => setTemplateId(OTHER)}
            className={cn(chip, templateId === OTHER ? chipOn : chipOff)}
          >
            Something else
          </button>
        </div>
        {templateId === OTHER ? (
          <label className="flex flex-col gap-1">
            <span className="sr-only">Workout name</span>
            <input
              className={input}
              value={otherName}
              maxLength={SHARED_PLAN_LIMITS.label}
              placeholder="Run, climbing, a class…"
              onChange={(e) => setOtherName(e.target.value)}
            />
          </label>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className={cn(sectionLabel, "mb-2")}>Day</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const count = crewCounts[d.dateKey] ?? 0;
            const on = d.dateKey === dateKey;
            return (
              <button
                key={d.dateKey}
                type="button"
                aria-pressed={on}
                aria-label={`${d.short} ${d.dayOfMonth}${count > 0 ? `, ${count} from the crew` : ""}`}
                onClick={() => setDateKey(d.dateKey)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-lg border text-sm leading-tight",
                  on
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-200 text-zinc-800 dark:border-zinc-700 dark:text-zinc-100",
                )}
              >
                <span className="text-[11px] opacity-70">{d.short}</span>
                <span className="font-semibold">{d.dayOfMonth}</span>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    on ? "text-emerald-300 dark:text-emerald-700" : "text-emerald-700 dark:text-emerald-400",
                    count === 0 && "invisible",
                  )}
                  aria-hidden
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Number = crew already training</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={cn(sectionLabel, "mb-2")}>Time (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {TIME_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={timeChip === c.id}
              onClick={() => setTimeChip(c.id)}
              className={cn(chip, timeChip === c.id ? chipOn : chipOff)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {timeChip === "custom" ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Time</span>
            <input
              type="time"
              className={cn(input, "w-36")}
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
          </label>
        ) : null}
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className={sectionLabel}>Where (optional)</span>
        <input
          className={input}
          value={where}
          maxLength={SHARED_PLAN_LIMITS.where}
          placeholder="Iron Works Gym"
          onChange={(e) => setWhere(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={sectionLabel}>Note (optional)</span>
        <input
          className={input}
          value={note}
          maxLength={SHARED_PLAN_LIMITS.note}
          placeholder="Meet by the squat racks"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {groups.length > 1 ? (
        <fieldset>
          <legend className={cn(sectionLabel, "mb-2")}>Share with</legend>
          <div className="flex flex-col gap-1">
            {groups.map((g) => (
              <label key={g.id} className="flex min-h-11 items-center gap-3 text-[15px]">
                <input
                  type="checkbox"
                  className="size-5 accent-emerald-700"
                  checked={groupIds.includes(g.id)}
                  onChange={(e) =>
                    setGroupIds((prev) =>
                      e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id),
                    )
                  }
                />
                {g.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {error ? <p className="text-sm text-zinc-700 dark:text-zinc-300">{error}</p> : null}

      <div className="flex gap-2">
        <button type="button" className={cn(outlineButton, "h-12 flex-1")} onClick={() => onOpenChange(false)}>
          Cancel
        </button>
        <button type="submit" disabled={!canSubmit} className={cn(primaryGreen, "flex-[2]")}>
          {busy ? "Saving…" : `Plan ${label || "it"} · ${day.short}`}
        </button>
      </div>
    </form>
  );
}
