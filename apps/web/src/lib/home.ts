import { coverOf } from "@sezi/shared";
import type { WorkListItem } from "@/lib/data";

/** ISO hafta numarası, yıl sınırlarında da aynı haftayı seçer. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function pickHero(works: readonly WorkListItem[], date: Date): WorkListItem | undefined {
  const eligible = works.filter((work) => {
    const photo = coverOf(work);
    return photo && photo.width != null && photo.height != null && photo.width >= 1600 && photo.height > 0 && photo.width / photo.height >= 1.3;
  }).sort((a, b) => a.slug.localeCompare(b.slug));
  return eligible[isoWeek(date) % eligible.length];
}
