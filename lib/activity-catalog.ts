/**
 * Static catalog of activity types (recreational / unstructured movement).
 * Adding a type = add a row here — no Firestore collection required for MVP.
 */

export type ActivityCatalogEntry = {
  id: string;
  name: string;
  /** Lucide icon name used by the log UI. */
  icon:
    | "footprints"
    | "bike"
    | "mountain"
    | "waves"
    | "circle-dot"
    | "circle"
    | "person-standing"
    | "music"
    | "dog"
    | "timer"
    | "activity";
  supportsDistance: boolean;
  /** Hint for future social / pickup features. */
  isSocial: boolean;
  /**
   * Hidden from the picker for new logs. Kept in the catalog so past logs
   * still show their name/icon and can be edited.
   */
  retired?: boolean;
};

export const ACTIVITY_CATALOG: ActivityCatalogEntry[] = [
  { id: "walk", name: "Walk", icon: "footprints", supportsDistance: true, isSocial: false },
  { id: "run", name: "Run", icon: "timer", supportsDistance: true, isSocial: false },
  {
    id: "dog-walk",
    name: "Dog walk",
    icon: "dog",
    supportsDistance: true,
    isSocial: false,
    retired: true,
  },
  { id: "bike", name: "Bike ride", icon: "bike", supportsDistance: true, isSocial: false },
  { id: "hike", name: "Hike", icon: "mountain", supportsDistance: true, isSocial: false },
  { id: "swim", name: "Swim", icon: "waves", supportsDistance: true, isSocial: false },
  { id: "tennis", name: "Tennis", icon: "circle-dot", supportsDistance: false, isSocial: true },
  {
    id: "pickleball",
    name: "Pickleball",
    icon: "circle-dot",
    supportsDistance: false,
    isSocial: true,
  },
  {
    id: "basketball",
    name: "Basketball",
    icon: "circle",
    supportsDistance: false,
    isSocial: true,
  },
  {
    id: "skate",
    name: "Skateboarding",
    icon: "person-standing",
    supportsDistance: false,
    isSocial: false,
  },
  { id: "dance", name: "Dance", icon: "music", supportsDistance: false, isSocial: false },
  {
    id: "play",
    name: "Playing with kids",
    icon: "person-standing",
    supportsDistance: false,
    isSocial: false,
    retired: true,
  },
  { id: "other", name: "Other", icon: "activity", supportsDistance: true, isSocial: false },
];

const BY_ID = new Map(ACTIVITY_CATALOG.map((a) => [a.id, a]));

export function getActivityTypeById(id: string): ActivityCatalogEntry | undefined {
  return BY_ID.get(id);
}

/**
 * Types offered in the picker: everything not retired, plus `currentId`
 * so editing an old log of a retired type still shows it selected.
 */
export function pickableActivityTypes(currentId?: string): ActivityCatalogEntry[] {
  return ACTIVITY_CATALOG.filter((a) => !a.retired || a.id === currentId);
}

export function activityTypeName(id: string): string {
  return BY_ID.get(id)?.name ?? "Activity";
}
