export type WorkoutCardProps = {
  name: string;
  dateLabel: string;
  exerciseCount: number;
};

export function WorkoutCard({ name, dateLabel, exerciseCount }: WorkoutCardProps) {
  return (
    <button
      type="button"
      className="flex w-full flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
    >
      <span className="font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
      <span className="text-sm text-zinc-500">{dateLabel}</span>
      <span className="text-xs text-zinc-400">
        {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"}
      </span>
    </button>
  );
}
