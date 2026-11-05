import type { WorkPhoto, WorkRow } from '@sezi/shared';

import covers from '../../assets/theme-covers.json';

type CoverSet = Partial<Record<'explore' | 'passport', Partial<Record<'light' | 'dark', string>>>>;
const cityCovers: Readonly<Record<string, CoverSet>> = covers;

/** Kapak seçimi veridir; fotoğrafın lisansı ve atfı katalog kaydından gelir. Eksikse ekran kendi kapağını korur. */
export function themeCover(
  works: readonly WorkRow[],
  city: string,
  screen: 'explore' | 'passport',
  dark: boolean,
): WorkPhoto | undefined {
  const path = cityCovers[city]?.[screen]?.[dark ? 'dark' : 'light'];
  if (!path) return undefined;
  for (const work of works) {
    if (work.city_slug !== city) continue;
    const photo = work.photos.find((photo) => photo.path === path);
    if (photo) return photo;
  }
  return undefined;
}
