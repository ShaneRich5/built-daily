import Link from "next/link";
import { cn } from "@/lib/utils";
import { DayTile, PrivacyNote, primaryGreen, sectionLabel, StackedAvatars } from "@/features/groups/group-ui";

export type JoinPlanCard = {
  weekday: string;
  dayOfMonth: number;
  label: string;
  /** "6:30 AM · Iron Works Gym" */
  meta: string;
  /** "Priya and Sam are going" */
  going: string | null;
};

export type JoinViewProps = {
  /** null when there's no preview for this code (older link, or nobody refreshed it yet). */
  headline: string;
  blurb: string | null;
  initials: string[];
  plan: JoinPlanCard | null;
  /** Button label when signed in: "Join Morning Crew". */
  joinLabel: string;
  signedIn: boolean;
  busy: boolean;
  error: string | null;
  signUpHref: string;
  signInHref: string;
  onJoin: () => void;
};

const STEPS = [
  "Log workouts like you normally would. Your days light up for the group.",
  "Say “I’m in” to a plan and it lands on your own planner.",
  "Cheer people when they show up. No feed, no leaderboard.",
];

/** G6: what you're joining and what's shared, before you even have an account. */
export function JoinView(props: JoinViewProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 pb-40">
      <p className="text-center text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Built Daily</p>

      <header className="flex flex-col items-center gap-3 text-center">
        {props.initials.length > 0 ? <StackedAvatars names={props.initials} max={5} size="md" /> : null}
        <h1 className="text-2xl font-bold tracking-tight text-balance text-zinc-900 dark:text-zinc-50">{props.headline}</h1>
        {props.blurb ? <p className="text-[15px] text-balance text-zinc-600 dark:text-zinc-300">{props.blurb}</p> : null}
      </header>

      {props.plan ? (
        <section className="rounded-2xl border-[1.5px] border-emerald-700 bg-white p-4 dark:border-emerald-500 dark:bg-zinc-950">
          <p className={cn(sectionLabel, "text-emerald-800 dark:text-emerald-300")}>You’re invited to</p>
          <div className="mt-2 flex items-center gap-3">
            <DayTile weekday={props.plan.weekday} day={props.plan.dayOfMonth} tone="green" />
            <span className="min-w-0">
              <span className="block text-[17px] font-semibold">{props.plan.label}</span>
              {props.plan.meta ? <span className="block text-[13px] text-zinc-600 dark:text-zinc-300">{props.plan.meta}</span> : null}
              {props.plan.going ? <span className="block text-xs text-zinc-500 dark:text-zinc-400">{props.plan.going}</span> : null}
            </span>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="how-heading" className="flex flex-col gap-3">
        <h2 id="how-heading" className={sectionLabel}>
          How it works
        </h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-[15px] text-zinc-700 dark:text-zinc-300">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <PrivacyNote>
        The group sees the days you train and plan, the workout name, and your weekly goal. Never your sets, weights, notes or body weight.
      </PrivacyNote>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {props.error ? <p className="text-center text-sm text-zinc-700 dark:text-zinc-300">{props.error}</p> : null}
          {props.signedIn ? (
            <button type="button" disabled={props.busy} onClick={props.onJoin} className={primaryGreen}>
              {props.busy ? "Joining…" : props.joinLabel}
            </button>
          ) : (
            <>
              <Link href={props.signUpHref} className={primaryGreen}>
                Create account &amp; join
              </Link>
              <Link
                href={props.signInHref}
                className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                I have an account · Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
