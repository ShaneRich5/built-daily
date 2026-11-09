"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SetFieldSpec,
  SetRow,
} from "@/features/workout-session/session-model";

// text-base below sm: iOS zooms the page when focusing inputs under 16px.
export const setInputClass =
  "h-11 w-full min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 font-mono text-base tabular-nums text-zinc-900 outline-none [appearance:textfield] placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-950 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

type SetFieldInputProps = {
  spec: SetFieldSpec;
  set: SetRow;
  setNumber: number;
  suggestion: SetRow | null;
  onChange: (patch: Partial<SetRow>) => void;
  /** Show the unit inside the box (used where there is no column header). */
  showUnit?: boolean;
};

/** One number box. Shows the suggested value greyed out when empty. */
export function SetFieldInput({
  spec,
  set,
  setNumber,
  suggestion,
  onChange,
  showUnit = false,
}: SetFieldInputProps) {
  const suggested = suggestion ? spec.read(suggestion) : "";
  const input = (
    <input
      type="number"
      inputMode={spec.inputMode}
      min={0}
      step="any"
      autoComplete="off"
      aria-label={spec.ariaLabel(setNumber)}
      value={spec.read(set)}
      placeholder={suggested || spec.label}
      onChange={(e) => onChange(spec.write(set, e.target.value))}
      className={cn(setInputClass, showUnit && "pr-9")}
    />
  );
  if (!showUnit) return input;
  return (
    <span className="relative block min-w-0 flex-1">
      {input}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-zinc-500 dark:text-zinc-400"
      >
        {spec.label}
      </span>
    </span>
  );
}

type SetDoneButtonProps = {
  done: boolean;
  setNumber: number;
  onToggle: () => void;
};

export function SetDoneButton({ done, setNumber, onToggle }: SetDoneButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={done ? `Set ${setNumber} done` : `Mark set ${setNumber} done`}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors",
        done
          ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950"
          : "border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-500",
      )}
    >
      <Check className="size-4" strokeWidth={2.5} aria-hidden />
    </button>
  );
}

/** CSS grid columns: set number, one per field, then the check button. */
export function setGridColumns(fieldCount: number): string {
  return `1.5rem repeat(${fieldCount}, minmax(0, 1fr)) 2.75rem`;
}

type QuickSetRowProps = {
  setNumber: number;
  set: SetRow;
  fields: SetFieldSpec[];
  suggestion: SetRow | null;
  onChange: (patch: Partial<SetRow>) => void;
  onToggleDone: () => void;
};

/** A set on the quick card: number, inputs, check. */
export function QuickSetRow({
  setNumber,
  set,
  fields,
  suggestion,
  onChange,
  onToggleDone,
}: QuickSetRowProps) {
  return (
    <div
      className="grid items-center gap-2"
      style={{ gridTemplateColumns: setGridColumns(fields.length) }}
    >
      <span className="font-mono text-xs text-zinc-500 tabular-nums">{setNumber}</span>
      {fields.map((spec) => (
        <SetFieldInput
          key={spec.id}
          spec={spec}
          set={set}
          setNumber={setNumber}
          suggestion={set.done ? null : suggestion}
          onChange={onChange}
        />
      ))}
      <SetDoneButton done={set.done} setNumber={setNumber} onToggle={onToggleDone} />
    </div>
  );
}
