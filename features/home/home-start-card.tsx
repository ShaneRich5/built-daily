import Link from "next/link";
import { ChevronDown, List, Plus, SquarePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  pickSuggestedStart,
  plannedWhen,
  startCopy,
  type HomeInProgress,
  type HomePlanned,
  type HomeSuggestedStart,
  type HomeTemplate,
} from "@/features/home/home-model";

/** How many other templates the Start menu lists before "Manage templates". */
const MENU_TEMPLATE_LIMIT = 5;

const secondaryButton =
  "inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";

type HomeStartCardProps = {
  todayKey: string;
  planned: HomePlanned | null;
  inProgress: HomeInProgress | null;
  templates: HomeTemplate[];
  onLogActivity: () => void;
};

/** Home's one job: start (or resume) a workout. */
export function HomeStartCard({
  todayKey,
  planned,
  inProgress,
  templates,
  onLogActivity,
}: HomeStartCardProps) {
  if (inProgress) return <ResumeCard workout={inProgress} />;

  const copy = startCopy(planned, templates.length > 0, todayKey, true);
  const suggested = pickSuggestedStart(planned, templates, todayKey);
  const plannedTag =
    planned?.planId ? { planId: planned.planId, label: `Planned ${plannedWhen(planned.dateKey, todayKey)}` } : null;

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

      <div className="flex h-14 overflow-hidden rounded-xl bg-emerald-700 dark:bg-emerald-600">
        <MainStartLink suggested={suggested} />
        <StartMenu
          suggested={suggested}
          templates={templates}
          plannedTag={plannedTag}
        />
      </div>

      <button type="button" onClick={onLogActivity} className={secondaryButton}>
        Log activity
      </button>
    </section>
  );
}

/** The big side of the split button: one tap starts the suggestion, or an empty workout. */
function MainStartLink({ suggested }: { suggested: HomeSuggestedStart | null }) {
  const className =
    "flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 text-white hover:bg-emerald-800 active:bg-emerald-900 dark:hover:bg-emerald-500";
  if (!suggested) {
    return (
      <Link href="/workout" className={`${className} flex-row items-center justify-center gap-2`}>
        <Plus className="size-[18px]" aria-hidden />
        <span className="text-base font-semibold">Start empty workout</span>
      </Link>
    );
  }
  return (
    <Link href={suggested.href} className={className}>
      <span className="truncate text-base font-semibold">Start {suggested.name}</span>
      <span className="truncate text-xs text-emerald-100">{suggested.meta}</span>
    </Link>
  );
}

/** The chevron: every other way to start, plus making and managing templates. */
function StartMenu({
  suggested,
  templates,
  plannedTag,
}: {
  suggested: HomeSuggestedStart | null;
  templates: HomeTemplate[];
  plannedTag: { planId: string; label: string } | null;
}) {
  const others = templates.filter((t) => t.id !== suggested?.templateId).slice(0, MENU_TEMPLATE_LIMIT);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Start a different workout"
            className="inline-flex w-14 shrink-0 items-center justify-center border-l border-white/30 text-white hover:bg-emerald-800 data-[popup-open]:bg-emerald-900 dark:hover:bg-emerald-500 dark:data-[popup-open]:bg-emerald-800"
          />
        }
      >
        <ChevronDown className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(20rem,calc(100vw-2rem))]">
        {others.length > 0 ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2.5 pt-2 pb-1 text-xs font-medium tracking-wide uppercase">
                Start something else
              </DropdownMenuLabel>
              {others.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  plannedLabel={plannedTag?.planId === template.id ? plannedTag.label : null}
                />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {suggested ? (
          <DropdownMenuItem className="min-h-12 gap-2.5 px-2.5" render={<Link href="/workout" />}>
            <Plus className="size-4" aria-hidden />
            Empty workout
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className="min-h-12 gap-2.5 px-2.5" render={<Link href="/templates/new" />}>
          <SquarePlus className="size-4" aria-hidden />
          New template
        </DropdownMenuItem>
        {templates.length > 0 ? (
          <DropdownMenuItem
            className="min-h-12 gap-2.5 px-2.5 text-zinc-700 dark:text-zinc-300"
            render={<Link href="/planner#templates" />}
          >
            <List className="size-4" aria-hidden />
            Manage templates
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TemplateItem({ template, plannedLabel }: { template: HomeTemplate; plannedLabel: string | null }) {
  // A template with no exercises can't start anything yet, so it opens the editor.
  const href = template.startHref ?? template.editHref;
  return (
    <DropdownMenuItem
      className="min-h-14 gap-2.5 px-2.5"
      render={<Link href={href} aria-label={`${template.startHref ? "Start" : "Edit"} ${template.name}`} />}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
          {template.name}
        </span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{template.meta}</span>
      </span>
      {plannedLabel ? (
        <span className="shrink-0 rounded-full border-[1.5px] border-emerald-700 px-2 py-px text-[11px] font-semibold text-emerald-700 dark:border-emerald-400 dark:text-emerald-400">
          {plannedLabel}
        </span>
      ) : !template.startHref ? (
        <span className="shrink-0 text-[13px] font-medium text-zinc-500">Edit</span>
      ) : null}
    </DropdownMenuItem>
  );
}

export function ResumeCard({ workout }: { workout: HomeInProgress }) {
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
