import { Image } from 'expo-image';

import { WorkGlyphInline } from '@/design/work-glyph';

/** Statik require: Metro dinamik yolu çözemez. Envanterin kısa slug'ları ve görsel adları birlikte eşlenir. */
const SOURCES: Record<string, number> = {
  cami: require('../../assets/categories/cami.webp'),
  medrese: require('../../assets/categories/medrese.webp'),
  turbe: require('../../assets/categories/turbe.webp'),
  cesme: require('../../assets/categories/cesme.webp'),
  hamam: require('../../assets/categories/hamam.webp'),
  han: require('../../assets/categories/han.webp'),
  imaret: require('../../assets/categories/imaret.webp'),
  kervansaray: require('../../assets/categories/kervansaray.webp'),
  kilise: require('../../assets/categories/kilise.webp'),
  kopru: require('../../assets/categories/kopru.webp'),
  mektep: require('../../assets/categories/mektep.webp'),
  darussifa: require('../../assets/categories/darussifa.webp'),
  carsi: require('../../assets/categories/carsi-ve-bedesten.webp'),
  'carsi-ve-bedesten': require('../../assets/categories/carsi-ve-bedesten.webp'),
  konak: require('../../assets/categories/konak-ve-ev.webp'),
  'konak-ve-ev': require('../../assets/categories/konak-ve-ev.webp'),
  hazire: require('../../assets/categories/hazire-ve-mezarlik.webp'),
  'hazire-ve-mezarlik': require('../../assets/categories/hazire-ve-mezarlik.webp'),
  tekke: require('../../assets/categories/tekke-ve-zaviye.webp'),
  'tekke-ve-zaviye': require('../../assets/categories/tekke-ve-zaviye.webp'),
};

export const hasCategoryArt = (slug: string) => slug in SOURCES;

/** Renkli tür çizimi; görseli olmayan türde mevcut tek renk glif kullanılır. */
export function CategoryArt({ slug, color, size = 64 }: { slug: string; color: string; size?: number }) {
  const source = SOURCES[slug];
  if (!source) return <WorkGlyphInline slug={slug} color={color} size={Math.round(size * 0.44)} />;
  return <Image accessible={false} source={source} style={{ width: size, height: size }} contentFit="contain" />;
}
