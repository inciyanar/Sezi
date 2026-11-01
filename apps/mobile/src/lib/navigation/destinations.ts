import { normalize } from '@sezi/shared';

import { pilotWorks, type PilotNode } from '../nav';

/** Rota hedefleri: pilot alandaki eserler, ada göre. */
export const DESTINATIONS = [...pilotWorks].sort((a, b) => (a.name?.tr ?? '').localeCompare(b.name?.tr ?? '', 'tr'));

export const destinationOf = (slug: string | null | undefined): PilotNode | undefined => (slug ? DESTINATIONS.find((n) => n.workSlug === slug) : undefined);

export const destinationName = (node: PilotNode, lang: 'tr' | 'en') => node.name?.[lang] ?? node.name?.tr ?? '';

/** Ada göre arama (Türkçe büyük/küçük harf ve şapka farkı gözetilmez); boş sorguda hepsi. */
export function searchDestinations(query: string, lang: 'tr' | 'en'): PilotNode[] {
  const q = normalize(query.trim());
  if (!q) return DESTINATIONS;
  return DESTINATIONS.filter((n) => normalize(destinationName(n, lang)).includes(q) || normalize(n.name?.tr ?? '').includes(q));
}

/** Yürüme süresi (dk), en az 1. */
export const minutesFor = (m: number, mps: number) => Math.max(1, Math.round(m / mps / 60));
