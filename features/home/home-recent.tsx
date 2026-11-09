import Link from "next/link";
import { Activity, ChevronRight, Dumbbell } from "lucide-react";
import type { HomeRecentItem } from "@/features/home/home-model";

/** The last few finished workouts and activities, with a way into full history. */
export function HomeRecent({ items }: { items: HomeRecentItem[] }) {
  return (
    <section aria-labelledby="home-recent-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2
          id="home-recent-heading"
          className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          Recent
        </h2>
        <Link
          href="/history"
          className="text-[13px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          See all
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Finished workouts and activities show up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link
                href={item.href}
                className="flex min-h-16 items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                {item.kind === "workout" ? (
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Dumbbell className="size-4" aria-hidden />
                    <span className="sr-only">Workout:</span>
                  </span>
                ) : (
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    <Activity className="size-4" aria-hidden />
                    <span className="sr-only">Activity:</span>
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{item.meta}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
