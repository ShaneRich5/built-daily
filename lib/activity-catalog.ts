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
    | "activity";
  supportsDistance: boolean;
  /** Hint for future social / pickup features. */
  isSocial: boolean;
};

export const ACTIVITY_CATALOG: ActivityCatalogEntry[] = [
  { id: "walk", name: "Walk", icon: "footprints", supportsDistance: true, isSocial: false },
  { id: "dog-walk", name: "Dog walk", icon: "dog", supportsDistance: true, isSocial: false },
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
  },
  { id: "other", name: "Other", icon: "activity", supportsDistance: true, isSocial: false },
];

const BY_ID = new Map(ACTIVITY_CATALOG.map((a) => [a.id, a]));

export function getActivityTypeById(id: string): ActivityCatalogEntry | undefined {
  return BY_ID.get(id);
}

export function activityTypeName(id: string): string {
  return BY_ID.get(id)?.name ?? "Activity";
}
