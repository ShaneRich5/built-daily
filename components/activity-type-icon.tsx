"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bike,
  Circle,
  CircleDot,
  Dog,
  Footprints,
  Mountain,
  Music,
  PersonStanding,
  Waves,
} from "lucide-react";
import type { ActivityCatalogEntry } from "@/lib/activity-catalog";

const ICONS: Record<ActivityCatalogEntry["icon"], LucideIcon> = {
  footprints: Footprints,
  bike: Bike,
  mountain: Mountain,
  waves: Waves,
  "circle-dot": CircleDot,
  circle: Circle,
  "person-standing": PersonStanding,
  music: Music,
  dog: Dog,
  activity: Activity,
};

export function ActivityTypeIcon({
  icon,
  className,
}: {
  icon: ActivityCatalogEntry["icon"];
  className?: string;
}) {
  const Icon = ICONS[icon] ?? Activity;
  return <Icon className={className} aria-hidden />;
}
