"use client";

import { MuscleMap } from "@musclemap/react";
import type {
  MuscleGroup as MapMuscleGroup,
  MuscleMapRegion,
  MuscleMapValues,
  MuscleMapView,
} from "@musclemap/core";
import {
  sessionMuscleScores,
  type MuscleFocus,
} from "@/lib/exercise-muscle";
import type { MuscleGroup } from "@/lib/progress-types";
import { cn } from "@/lib/utils";

type DiagramSize = "compact" | "card" | "full";

const SIZE_CLASS: Record<DiagramSize, string> = {
  compact: "w-[4.75rem] shrink-0",
  card: "w-[6.5rem] shrink-0",
  full: "w-full",
};

const FIGURE_WIDTH: Record<DiagramSize, number> = {
  compact: 28,
  card: 40,
  full: 148,
};

const FOCUS_CAMERA: Record<
  MuscleFocus,
  { view: MuscleMapView; region: MuscleMapRegion; crop: boolean }
> = {
  full: { view: "BOTH", region: "FULL_BODY", crop: false },
  torso: { view: "FRONT", region: "UPPER_BODY", crop: true },
  back: { view: "BACK", region: "UPPER_BODY", crop: true },
  arms: { view: "BOTH", region: "UPPER_BODY", crop: true },
  legs: { view: "BOTH", region: "LOWER_BODY", crop: true },
  core: { view: "FRONT", region: "CORE", crop: true },
};

const APP_TO_MAP: Record<
  Exclude<MuscleGroup, "cardio" | "other">,
  MapMuscleGroup[]
> = {
  chest: ["CHEST"],
  back: ["TRAPEZIUS", "RHOMBOIDS", "LATS", "BACK_UPPER", "BACK_LOWER"],
  shoulders: ["SHOULDERS_FRONT", "SHOULDERS_SIDE", "SHOULDERS_REAR"],
  arms: ["BICEPS", "TRICEPS", "FOREARMS"],
  core: ["CORE", "OBLIQUES"],
  legs: [
    "GLUTES",
    "QUADS",
    "HAMSTRINGS",
    "CALVES",
    "ADDUCTORS",
    "ABDUCTORS",
    "HIP_FLEXORS",
  ],
};

const MAP_TO_APP: Record<MapMuscleGroup, MuscleGroup> = {
  CHEST: "chest",
  BACK_UPPER: "back",
  BACK_LOWER: "back",
  TRAPEZIUS: "back",
  RHOMBOIDS: "back",
  LATS: "back",
  SHOULDERS_FRONT: "shoulders",
  SHOULDERS_SIDE: "shoulders",
  SHOULDERS_REAR: "shoulders",
  BICEPS: "arms",
  TRICEPS: "arms",
  FOREARMS: "arms",
  CORE: "core",
  OBLIQUES: "core",
  GLUTES: "legs",
  QUADS: "legs",
  HAMSTRINGS: "legs",
  CALVES: "legs",
  HIP_FLEXORS: "legs",
  ADDUCTORS: "legs",
  ABDUCTORS: "legs",
};

function valuesFromScores(
  scores: Partial<Record<MuscleGroup, number>>,
): MuscleMapValues {
  const values: MuscleMapValues = {};
  for (const [rawGroup, score] of Object.entries(scores)) {
    const group = rawGroup as MuscleGroup;
    if (group === "cardio" || group === "other" || score == null || score <= 0) {
      continue;
    }
    for (const mapGroup of APP_TO_MAP[group as keyof typeof APP_TO_MAP]) {
      const current = values[mapGroup]?.score ?? 0;
      if (score > current) values[mapGroup] = { score };
    }
  }
  return values;
}

function valuesFor(
  primary?: MuscleGroup,
  secondary?: MuscleGroup[],
): MuscleMapValues {
  const scores: Partial<Record<MuscleGroup, number>> = {};
  if (!primary || primary === "cardio" || primary === "other") return {};
  scores[primary] = 100;
  for (const extra of secondary ?? []) {
    if (extra === primary || extra === "cardio" || extra === "other") continue;
    if (scores[extra] == null) scores[extra] = 46;
  }
  return valuesFromScores(scores);
}

export function MuscleTargetDiagram({
  primary,
  secondary,
  exercises,
  focus = "full",
  compact = false,
  size,
  className,
  onSelectGroup,
}: {
  primary?: MuscleGroup;
  secondary?: MuscleGroup[];
  /** When set, scores stack across the session so the map fills in as you add moves. */
  exercises?: Array<{
    id: string;
    name: string;
    primary?: MuscleGroup;
    secondary?: MuscleGroup[];
  }>;
  focus?: MuscleFocus;
  compact?: boolean;
  size?: DiagramSize;
  className?: string;
  onSelectGroup?: (group: MuscleGroup) => void;
}) {
  const resolvedSize: DiagramSize = compact ? "compact" : (size ?? "full");
  const interactive = Boolean(onSelectGroup);
  const camera = FOCUS_CAMERA[focus];
  const baseWidth = FIGURE_WIDTH[resolvedSize];
  const figureWidth =
    camera.view === "BOTH" ? baseWidth : Math.round(baseWidth * 1.55);
  const values = exercises
    ? valuesFromScores(sessionMuscleScores(exercises))
    : valuesFor(primary, secondary);

  return (
    <div
      className={cn(
        "bg-[#0b1220]",
        resolvedSize === "full" && "rounded-xl px-1 py-2",
        resolvedSize === "card" && "rounded-md p-0.5",
        resolvedSize === "compact" && "rounded-sm p-px",
        SIZE_CLASS[resolvedSize],
        !interactive && "pointer-events-none",
        className,
      )}
    >
      <MuscleMap
        values={values}
        view={camera.view}
        region={camera.region}
        cropToRegion={camera.crop}
        monochromeColor="#10b981"
        glow={resolvedSize === "full"}
        showLegend={false}
        tooltipFields={[]}
        figureWidth={figureWidth}
        onSelectMuscle={
          onSelectGroup
            ? ({ group }) => onSelectGroup(MAP_TO_APP[group])
            : undefined
        }
        style={{ gap: 4 }}
      />
    </div>
  );
}
