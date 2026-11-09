import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import {
  weekGoalCopy,
  type HomeInProgress,
  type HomePlanned,
  type HomeTemplate,
  type HomeWeekGoal,
} from "@/features/home/home-model";

/** How many templates home lists before "All". */
const TEMPLATE_LIMIT = 3;

const sectionLabel =
  "text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400";
const secondaryButton =
  "inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";

type HomeStartCardProps = {
  weekGoal: HomeWeekGoal;
  planned: HomePlanned | null;
  inProgress: HomeInProgress | null;
  templates: HomeTemplate[];
  onLogActivity: () => void;
};

/** Home's one job: start (or resume) a workout. */
export function HomeStartCard({
  weekGoal,
  planned,
  inProgress,
  templates,
  onLogActivity,
}: HomeStartCardProps) {
  if (inProgress) return <ResumeCard workout={inProgress} />;

  const copy = weekGoalCopy(weekGoal, planned);
  return (
    <section
      aria-labelledby="home-start-heading"
      className="flex flex-col gap-3.5 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div>
        <h2 id="home-start-heading" className="text-[17px] font-semibold text-zinc-900 dark:text-zinc-50">
          {copy.headline}
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">{copy.detail}</p>
      </div>

      <Link
        href="/workout"
        className="flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800 active:scale-[0.99] dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        <Plus className="size-[18px]" aria-hidden />
        Start empty workout
      </Link>

      <div className="flex flex-col gap-1.5">
        {templates.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className={sectionLabel}>Or start from a template</h3>
              <Link
                href="/planner#templates"
                className="text-[13px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                All
              </Link>
            </div>
            <ul className="flex flex-col gap-1.5">
              {templates.slice(0, TEMPLATE_LIMIT).map((template) => (
                <li key={template.id}>
                  <TemplateRow template={template} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="flex gap-2 pt-0.5">
          <Link
            href="/templates/new"
            className={`${secondaryButton} border-dashed border-zinc-300 dark:border-zinc-700`}
          >
            + New template
          </Link>
          <button type="button" onClick={onLogActivity} className={secondaryButton}>
            Log activity
          </button>
        </div>
      </div>
    </section>
  );
}

function TemplateRow({ template }: { template: HomeTemplate }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
          {template.name}
        </span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{template.meta}</span>
      </span>
      {template.startHref ? (
        <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
          Start
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      ) : (
        <span className="text-[13px] font-medium text-zinc-500">Edit</span>
      )}
    </>
  );
  const className =
    "flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900";
  // A template with no exercises can't start anything yet, so it opens the editor.
  return template.startHref ? (
    <Link href={template.startHref} className={className} aria-label={`Start ${template.name}`}>
      {body}
    </Link>
  ) : (
    <Link href={template.editHref} className={className} aria-label={`Edit ${template.name}`}>
      {body}
    </Link>
  );
}

function ResumeCard({ workout }: { workout: HomeInProgress }) {
  return (
    <section
      aria-labelledby="home-resume-heading"
      className="flex flex-col gap-3.5 rounded-2xl border-[1.5px] border-zinc-900 bg-white p-4 dark:border-zinc-100 dark:bg-zinc-950"
    >
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-800 uppercase dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="size-2 rounded-full bg-amber-500" aria-hidden />
        In progress
      </span>
      <div>
        <h2 id="home-resume-heading" className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {workout.title}
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">{workout.meta}</p>
      </div>
      <Link
        href={workout.href}
        className="flex h-13 items-center justify-center rounded-xl bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        Resume workout
      </Link>
      <Link
        href="/workout"
        className="self-center py-2 text-[13px] font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Start a different workout
      </Link>
    </section>
  );
}
