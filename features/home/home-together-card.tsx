import Link from "next/link";
import { Users } from "lucide-react";

export type HomeTogether = {
  label: string;
  /** "6:30 AM · Iron Works Gym" */
  meta: string;
  /** "Priya and you are going" */
  going: string;
  planHref: string;
  startHref: string | null;
};

/** G9: on a day you have a plan together, home leads with it. */
export function HomeTogetherCard({ together }: { together: HomeTogether }) {
  return (
    <section
      aria-labelledby="home-together-heading"
      className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-emerald-700 bg-white p-4 dark:border-emerald-500 dark:bg-zinc-950"
    >
      <span className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold tracking-wide text-emerald-800 uppercase dark:text-emerald-300">
        <Users className="size-3.5" aria-hidden />
        Training with someone today
      </span>
      <Link href={together.planHref} className="block">
        <h2 id="home-together-heading" className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {together.label}
        </h2>
        <p className="mt-0.5 text-[13px] text-zinc-600 dark:text-zinc-300">{together.meta}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{together.going}</p>
      </Link>
      {together.startHref ? (
        <Link
          href={together.startHref}
          className="flex h-12 items-center justify-center rounded-xl bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          Start
        </Link>
      ) : null}
    </section>
  );
}
