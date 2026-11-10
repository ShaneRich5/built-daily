import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const sectionLabel =
  "text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400";
export const card =
  "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";
export const primaryGreen =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500";
export const primaryDark =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-[15px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";
export const outlineButton =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900";

export function SectionHeader({ title, aside, id }: { title: string; aside?: string; id?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 id={id} className={sectionLabel}>
        {title}
      </h2>
      {aside ? <span className="text-xs text-zinc-500 dark:text-zinc-400">{aside}</span> : null}
    </div>
  );
}

/** Round initial. `ring` = trained today. */
export function Avatar({
  name,
  ring = false,
  size = "md",
  className,
}: {
  name: string;
  ring?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
        size === "sm" && "size-7 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-12 text-base",
        ring && "ring-2 ring-emerald-600 ring-offset-2 ring-offset-white dark:ring-emerald-500 dark:ring-offset-zinc-950",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function StackedAvatars({ names, max = 4, size = "sm" }: { names: string[]; max?: number; size?: "sm" | "md" }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="flex -space-x-2" aria-hidden>
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} className="border-2 border-white dark:border-zinc-950" />
      ))}
      {extra > 0 ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full border-2 border-white bg-zinc-200 text-[11px] font-semibold text-zinc-600 dark:border-zinc-950 dark:bg-zinc-700 dark:text-zinc-200",
            size === "sm" ? "size-7" : "size-10",
          )}
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

export function GoingPill() {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full bg-emerald-50 px-3 text-[13px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
      <Check className="size-3.5" aria-hidden />
      Going
    </span>
  );
}

export function ImInButton({
  label,
  onClick,
  busy,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className="inline-flex h-11 min-w-[72px] items-center justify-center rounded-lg border border-emerald-700 px-3 text-[13px] font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
    >
      {busy ? "…" : "I’m in"}
    </button>
  );
}

/** "Thu" over "12". `dark` for the plan detail header. */
export function DayTile({
  weekday,
  day,
  tone = "plain",
}: {
  weekday: string;
  day: number;
  tone?: "plain" | "dark" | "green";
}) {
  return (
    <span
      className={cn(
        "flex w-11 shrink-0 flex-col items-center justify-center rounded-lg py-1.5 leading-none",
        tone === "plain" && "bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50",
        tone === "dark" && "h-14 w-14 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900",
        tone === "green" && "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
      )}
    >
      <span className="text-[11px] font-medium uppercase opacity-70">{weekday}</span>
      <span className={cn("mt-1 font-semibold", tone === "dark" ? "text-xl" : "text-[17px]")}>{day}</span>
    </span>
  );
}

export function PrivacyNote({ children }: { children?: ReactNode }) {
  return (
    <p className="px-1 text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
      {children ??
        "Members see the days you train and plan, plus the workout name. Your sets, weights and notes stay yours."}
    </p>
  );
}

/** One week cell: filled = trained, ring = planned, faint ring = nothing (never "missed"). */
export function DayDot({ mark, label }: { mark: "trained" | "planned" | "none"; label?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block size-4 rounded-full",
        mark === "trained" && "bg-emerald-600 dark:bg-emerald-500",
        mark === "planned" && "border-2 border-emerald-600 dark:border-emerald-500",
        mark === "none" && "border border-zinc-300 dark:border-zinc-700",
      )}
    />
  );
}
