import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { Fraunces_400Regular, Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces';
import type { TextStyle } from 'react-native';

/**
 * İki yazı tipi:
 * - Fraunces (serif, 400): ekran, eser ve tur başlıkları, kart adı; italik hâli başlık vurgusu (`RichTitle`).
 *   Tasarımdaki 300 ağırlık az görenler için ince; 400 kullanılır.
 * - Atkinson Hyperlegible Next (Braille Institute): az gören okurlar için tasarlandı; okuma metni, düğme, etiket
 *   ve yön talimatları (`display`). Yön talimatına serif başlık yazısı taşınmaz.
 */
export const fontAssets = {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
};

export const font = {
  body: 'AtkinsonHyperlegibleNext_400Regular',
  bodySemi: 'AtkinsonHyperlegibleNext_600SemiBold',
  bodyBold: 'AtkinsonHyperlegibleNext_700Bold',
  serif: 'Fraunces_400Regular',
  serifItalic: 'Fraunces_400Regular_Italic',
} as const;

/** Tipografi ölçeği. Okuma metni 17/26'nın altına inmez; en küçük etiket 12. */
export const type = {
  /** Açılış ve fotoğraflı başlıklar. */
  hero: { fontFamily: font.serif, fontSize: 44, lineHeight: 46, letterSpacing: -1.4 },
  /** Sekme ekranı başlığı (Pasaport, Sezilenler…). */
  screenTitle: { fontFamily: font.serif, fontSize: 34, lineHeight: 36, letterSpacing: -1 },
  /** Eser ve tur sayfasındaki büyük ad. */
  editorial: { fontFamily: font.serif, fontSize: 32, lineHeight: 34, letterSpacing: -0.9 },
  /** Yön talimatı: Atkinson, büyük ve kalın (okunabilirlik önce). */
  display: { fontFamily: font.bodyBold, fontSize: 32, lineHeight: 40, letterSpacing: -0.3 },
  title: { fontFamily: font.serif, fontSize: 24, lineHeight: 28, letterSpacing: -0.6 },
  heading: { fontFamily: font.serif, fontSize: 20, lineHeight: 24, letterSpacing: -0.4 },
  itemTitle: { fontFamily: font.bodyBold, fontSize: 17, lineHeight: 22 },
  cardTitle: { fontFamily: font.serif, fontSize: 20, lineHeight: 22, letterSpacing: -0.3 },
  body: { fontFamily: font.body, fontSize: 17, lineHeight: 26 },
  lead: { fontFamily: font.body, fontSize: 19, lineHeight: 28 },
  meta: { fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  /** Üst etiket: `upper()` ile büyük harf yazılır. */
  eyebrow: { fontFamily: font.bodyBold, fontSize: 13, lineHeight: 18, letterSpacing: 1.8 },
  button: { fontFamily: font.bodyBold, fontSize: 17, lineHeight: 22 },
  bubble: { fontFamily: font.bodyBold, fontSize: 14, lineHeight: 18 },
  tab: { fontFamily: font.bodyBold, fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TextStyle>;

/** Türkçe kurallarına uygun büyük harf (i→İ, ı→I); üst etiketler için. */
export function upper(text: string, lang: 'tr' | 'en'): string {
  return lang === 'tr' ? text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase() : text.toUpperCase();
}

/** Köşe ölçeği: küçük öğe 10, kontrol ve düğme 16, kart 22, büyük kart ve panel 28. iOS'ta `borderCurve: 'continuous'` ile çizilir. */
export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
