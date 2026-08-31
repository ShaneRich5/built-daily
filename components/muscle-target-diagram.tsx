import type { MuscleFocus } from "@/lib/exercise-muscle";
import type { MuscleGroup } from "@/lib/progress-types";

const FOCUS_VIEWBOX: Record<MuscleFocus, string> = {
  full: "0 0 280 340",
  upper: "0 0 280 185",
  lower: "0 140 280 200",
  arms: "0 42 280 130",
};

const FILL = {
  idle: "fill-zinc-200 dark:fill-zinc-700",
  secondary: "fill-emerald-200 dark:fill-emerald-800",
  primary: "fill-emerald-500 dark:fill-emerald-400",
  rest: "fill-zinc-100 dark:fill-zinc-800",
} as const;

function fillFor(
  group: MuscleGroup,
  primary?: MuscleGroup,
  secondary?: MuscleGroup[],
): string {
  if (!primary || primary === "cardio" || primary === "other") {
    return FILL.idle;
  }
  if (group === primary) return FILL.primary;
  if (secondary?.includes(group)) return FILL.secondary;
  return FILL.idle;
}

function BodyFigure({
  variant,
  primary,
  secondary,
}: {
  variant: "front" | "back";
  primary?: MuscleGroup;
  secondary?: MuscleGroup[];
}) {
  const isFront = variant === "front";
  const f = (g: MuscleGroup) => fillFor(g, primary, secondary);

  return (
    <g>
      {/* Arms sit behind the torso so they tuck under the shoulders. */}
      <rect
        x="12"
        y="62"
        width="18"
        height="50"
        rx="9"
        className={f("arms")}
        transform="rotate(-18 21 87)"
      />
      <rect
        x="100"
        y="62"
        width="18"
        height="50"
        rx="9"
        className={f("arms")}
        transform="rotate(18 109 87)"
      />
      <rect
        x="4"
        y="108"
        width="16"
        height="46"
        rx="8"
        className={f("arms")}
        transform="rotate(-8 12 131)"
      />
      <rect
        x="110"
        y="108"
        width="16"
        height="46"
        rx="8"
        className={f("arms")}
        transform="rotate(8 118 131)"
      />

      <ellipse cx="32" cy="58" rx="17" ry="13" className={f("shoulders")} />
      <ellipse cx="98" cy="58" rx="17" ry="13" className={f("shoulders")} />

      {isFront ? (
        <>
          <rect
            x="48"
            y="92"
            width="34"
            height="50"
            rx="12"
            className={f("core")}
          />
          <ellipse cx="52" cy="78" rx="17" ry="19" className={f("chest")} />
          <ellipse cx="78" cy="78" rx="17" ry="19" className={f("chest")} />
        </>
      ) : (
        <>
          <path
            d="M38 78 C42 118 65 128 65 128 C65 128 88 118 92 78 C78 108 52 108 38 78Z"
            className={f("back")}
          />
          <ellipse cx="65" cy="76" rx="30" ry="22" className={f("back")} />
        </>
      )}

      <ellipse cx="65" cy="22" rx="15" ry="17" className={FILL.rest} />
      <rect
        x="58"
        y="36"
        width="14"
        height="12"
        rx="4"
        className={FILL.rest}
      />

      {isFront ? (
        <rect
          x="46"
          y="138"
          width="38"
          height="16"
          rx="8"
          className={f("legs")}
        />
      ) : (
        <>
          <ellipse cx="52" cy="150" rx="15" ry="13" className={f("legs")} />
          <ellipse cx="78" cy="150" rx="15" ry="13" className={f("legs")} />
        </>
      )}

      <rect
        x="44"
        y="152"
        width="20"
        height="68"
        rx="10"
        className={f("legs")}
      />
      <rect
        x="66"
        y="152"
        width="20"
        height="68"
        rx="10"
        className={f("legs")}
      />
      <rect
        x="46"
        y="218"
        width="16"
        height="58"
        rx="8"
        className={f("legs")}
      />
      <rect
        x="68"
        y="218"
        width="16"
        height="58"
        rx="8"
        className={f("legs")}
      />
      <ellipse cx="52" cy="282" rx="12" ry="6" className={FILL.rest} />
      <ellipse cx="78" cy="282" rx="12" ry="6" className={FILL.rest} />
    </g>
  );
}

export function MuscleTargetDiagram({
  primary,
  secondary,
  focus = "full",
  compact = false,
  className,
}: {
  primary?: MuscleGroup;
  secondary?: MuscleGroup[];
  focus?: MuscleFocus;
  compact?: boolean;
  className?: string;
}) {
  const viewBox = compact ? FOCUS_VIEWBOX.full : FOCUS_VIEWBOX[focus];

  return (
    <svg
      viewBox={viewBox}
      aria-hidden
      className={
        compact
          ? `pointer-events-none h-10 w-8 shrink-0 ${className ?? ""}`
          : `h-auto w-full max-h-72 ${className ?? ""}`
      }
    >
      <g transform="translate(5 8)">
        <BodyFigure
          variant="front"
          primary={primary}
          secondary={secondary}
        />
      </g>
      <g transform="translate(145 8)">
        <BodyFigure
          variant="back"
          primary={primary}
          secondary={secondary}
        />
      </g>
      {compact || focus !== "full" ? null : (
        <>
          <text
            x="70"
            y="328"
            textAnchor="middle"
            fontSize={11}
            className="fill-zinc-400 dark:fill-zinc-500"
          >
            Front
          </text>
          <text
            x="210"
            y="328"
            textAnchor="middle"
            fontSize={11}
            className="fill-zinc-400 dark:fill-zinc-500"
          >
            Back
          </text>
        </>
      )}
    </svg>
  );
}
