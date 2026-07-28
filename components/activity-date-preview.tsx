import { formatActivityDatePreview } from "@/lib/workout-date";

type ActivityDatePreviewProps = {
  dateKey: string;
};

export function ActivityDatePreview({ dateKey }: ActivityDatePreviewProps) {
  const preview = formatActivityDatePreview(dateKey);
  if (!preview) return null;

  return (
    <p
      className="text-xs leading-snug text-zinc-500 dark:text-zinc-400"
      aria-live="polite"
    >
      {preview}
    </p>
  );
}
