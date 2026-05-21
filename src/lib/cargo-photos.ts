/** Customer truck/moving cargo photo slots (uploaded before job create). */
export const CARGO_PHOTO_SLOTS = [
  { id: "main", label: "Main item" },
  { id: "side", label: "Side view" },
  { id: "obstacles", label: "Obstacles" },
] as const;

export type CargoPhotoSlotId = (typeof CARGO_PHOTO_SLOTS)[number]["id"];

export type CargoPhotoUrls = Partial<Record<CargoPhotoSlotId, string>>;

export function cargoPhotoUrlList(photos: CargoPhotoUrls | undefined): string[] {
  if (!photos) return [];
  return CARGO_PHOTO_SLOTS.map((s) => photos[s.id]).filter((u): u is string => Boolean(u));
}
