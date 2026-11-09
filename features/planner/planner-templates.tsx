import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type PlannerTemplateRow = { id: string; name: string; meta: string };

/** Your templates, each opening its editor. */
export function PlannerTemplates({ templates }: { templates: PlannerTemplateRow[] }) {
  return (
    <section id="templates" aria-labelledby="planner-templates-heading" className="flex scroll-mt-4 flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2
          id="planner-templates-heading"
          className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          Templates
        </h2>
        <Link
          href="/templates/new"
          className="text-[13px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          + New
        </Link>
      </div>
      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Save a list of exercises once, then start or plan it in one tap.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/templates/${t.id}`}
                className="flex min-h-14 items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{t.name}</span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{t.meta}</span>
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
