/**
 * "Sezi kâğıt" teması: sıcak kâğıt zemin, mürekkep metin, kiremit vurgu ve altın.
 * Ana eylem mürekkep haptır (koyu temada altın). Altın yalnız dolgu ya da koyu zemin üstünde yazıdır;
 * açık zeminde yazı olarak okunmaz. Fotoğraf üstündeki yazı `onPhoto`, buzlu cam yüzeyler `glass` ile çizilir.
 * Altı yumuşak ton (kobalt, firuze, mercan, safran, adaçayı, erik) tür ve vurgu için kullanılır;
 * her ton bir açık dolgu ve üstünde okunacak koyu "mürekkep" çiftidir (AA ≥ 4.5, testle korunur).
 */

export type SweetToneName = "cobalt" | "teal" | "coral" | "saffron" | "sage" | "plum";

/** Dolgu + üstündeki metin/ikon rengi (AA ≥ 4.5). */
export interface SweetTone {
  fill: string;
  ink: string;
}

/** Sekme çubuğu: ekrandan ayrık, yüzen koyu hap; seçili sekmede simgenin arkasında gösterge, simge altın. */
export interface SweetNav {
  background: string;
  /** Seçili olmayan simge ve yazı. */
  foreground: string;
  /** Seçili sekme yazısı (çubuk zemini üstünde). */
  activeLabel: string;
  /** Seçili simgenin arkasındaki kapsül ve üstündeki simge. */
  activeBackground: string;
  activeForeground: string;
}

/** Buzlu cam yüzeyi: `tint` rengi `alpha` opaklıkla bulanık fotoğrafın üstüne serilir. */
export interface GlassTone {
  tint: string;
  alpha: number;
  text: string;
  muted: string;
}

export interface SweetTheme {
  background: string;
  surface: string;
  /** Dolgulu alanlar: arama kutusu, ikon düğmesi, iskelet, liste seçeneği. */
  soft: string;
  text: string;
  textMuted: string;
  border: string;
  shadow: string;
  danger: string;
  /** Yüksek kontrast: dolgu yok, her yüzey 2 dp çerçeveyle ayrılır. */
  outlined: boolean;
  /** Ana eylem: açık temada mürekkep hap, koyu temada altın. `primary.ink` yalnız `primary.fill` üstünde okunur. */
  primary: SweetTone;
  /** Bağlantı, italik başlık vurgusu ve seçili kutucuğun dolgusu (üstünde `background`). */
  primaryText: string;
  /** Vurgu: UNESCO rozeti, uyarı dolgusu. */
  accent: SweetTone;
  /** Vurgu rengi zemin ya da yüzey üstünde ön plan (uyarı yazısı, hedef işareti). */
  accentText: string;
  /** Altın: ok dairesi, oynat düğmesi, seçili sekme simgesi. Açık zeminde yazı olarak kullanılmaz. */
  gold: SweetTone;
  /** Fotoğraf ve koyu bant üstündeki yazı; `accent` italik vurgu. */
  onPhoto: { text: string; muted: string; accent: string };
  glass: { light: GlassTone; dark: GlassTone };
  tones: Record<SweetToneName, SweetTone>;
  nav: SweetNav;
}

const lightTones: Record<SweetToneName, SweetTone> = {
  cobalt: { fill: "#E4E8FC", ink: "#2A3C9C" },
  teal: { fill: "#DBF0EB", ink: "#1C5D55" },
  coral: { fill: "#FDE3DA", ink: "#9A361D" },
  saffron: { fill: "#FAEDCB", ink: "#6E520A" },
  sage: { fill: "#E4EDDC", ink: "#3B5728" },
  plum: { fill: "#F2E1EE", ink: "#7A3266" },
};

const darkTones: Record<SweetToneName, SweetTone> = {
  cobalt: { fill: "#232A4A", ink: "#C9D2FF" },
  teal: { fill: "#183632", ink: "#A9E6DA" },
  coral: { fill: "#3D241C", ink: "#FFC6B3" },
  saffron: { fill: "#3A3018", ink: "#F6DD9A" },
  sage: { fill: "#252F1F", ink: "#C9E0B5" },
  plum: { fill: "#36202F", ink: "#F1C2E4" },
};

const plain: SweetTone = { fill: "#FFFFFF", ink: "#000000" };

const gold: SweetTone = { fill: "#C9A25E", ink: "#17140F" };
const onPhoto = { text: "#FBF8F2", muted: "#E9E2D6", accent: "#C9A25E" };
/**
 * Buzlu cam: bulanıklaşan fotoğrafın üstüne serilen ton (maketteki `.frost`, `.frost-dark`). Saydamlık, bulanıklık
 * hiç çizilemese bile en kötü zeminde (siyah ya da beyaz) metni AA'da tutar (testle korunur); bu yüzden açık camın
 * ikincil yazısı mürekkebe yakındır.
 */
const glass: SweetTheme["glass"] = {
  light: { tint: "#F4EFE7", alpha: 0.66, text: "#17140F", muted: "#3A332A" },
  dark: { tint: "#17140F", alpha: 0.72, text: "#FBF8F2", muted: "#D9D1C4" },
};
/**
 * Puslu (ince) açık cam: eser kapağının üstündeki yarım. Cam neredeyse saydamdır (`GLASS_THIN_ALPHA`), hafif bulanık ve
 * kumludur; fotoğraf arkasından açıkça görünür. Yazının okunurluğu camın tamamına değil, yalnız yazı bloklarının arkasına
 * serilen ve kenarları solan pusa (`GLASS_VEIL_ALPHA`) bağlıdır: en kötü (siyah) zeminde ana yazı AA'yı geçer, ikincil
 * yazı da ana yazı rengiyle çizilir (testle korunur).
 */
export const GLASS_THIN_ALPHA = 0.18;
export const GLASS_VEIL_ALPHA = 0.56;

export const sweetThemes: Record<"light" | "dark" | "highContrast", SweetTheme> = {
  light: {
    background: "#F4EFE7",
    surface: "#FBF8F2",
    soft: "#EAE2D4",
    text: "#17140F",
    textMuted: "#5B5246",
    border: "#DDD3C1",
    shadow: "#3C2814",
    danger: "#B3261E",
    outlined: false,
    primary: { fill: "#17140F", ink: "#FBF8F2" },
    primaryText: "#562B1D",
    accent: { fill: "#F3E1D7", ink: "#8C3B20" },
    accentText: "#8C3B20",
    gold,
    onPhoto,
    glass,
    tones: lightTones,
    nav: { background: "#17140F", foreground: "#BDB3A4", activeLabel: "#FBF8F2", activeBackground: "#3A332A", activeForeground: "#C9A25E" },
  },
  dark: {
    background: "#17140F",
    surface: "#221E18",
    soft: "#2C271F",
    text: "#FBF8F2",
    textMuted: "#BDB3A4",
    border: "#3A332A",
    shadow: "#000000",
    danger: "#FFB4AB",
    outlined: false,
    primary: { fill: "#C9A25E", ink: "#17140F" },
    primaryText: "#C9A25E",
    accent: { fill: "#3D2419", ink: "#F2B49A" },
    accentText: "#F2B49A",
    gold,
    onPhoto,
    glass,
    tones: darkTones,
    nav: { background: "#221E18", foreground: "#BDB3A4", activeLabel: "#FBF8F2", activeBackground: "#3A332A", activeForeground: "#C9A25E" },
  },
  highContrast: {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    soft: "#FFFFFF",
    text: "#000000",
    textMuted: "#1E1A17",
    border: "#000000",
    shadow: "#000000",
    danger: "#8E1F1A",
    outlined: true,
    primary: { fill: "#000000", ink: "#FFFFFF" },
    primaryText: "#064C50",
    accent: { fill: "#8E1F1A", ink: "#FFFFFF" },
    accentText: "#8E1F1A",
    gold: { fill: "#000000", ink: "#FFFFFF" },
    // Fotoğraf üstündeki yazının arkasına opak siyah perde konur; cam opaktır.
    onPhoto: { text: "#FFFFFF", muted: "#FFFFFF", accent: "#FFFFFF" },
    glass: {
      light: { tint: "#FFFFFF", alpha: 1, text: "#000000", muted: "#000000" },
      dark: { tint: "#000000", alpha: 1, text: "#FFFFFF", muted: "#FFFFFF" },
    },
    tones: { cobalt: plain, teal: plain, coral: plain, saffron: plain, sage: plain, plum: plain },
    nav: { background: "#FFFFFF", foreground: "#000000", activeLabel: "#000000", activeBackground: "#000000", activeForeground: "#FFFFFF" },
  },
};

/**
 * Renk körlüğüne uygun tonlar (Okabe–Ito ailesi: mavi, mavimsi yeşil, turuncu-kırmızı, sarı, gri, morumsu pembe).
 * Pastel tonlar kırmızı-yeşil körlüğünde birbirine karışıyor; bunlar daha doygun ve parlaklıkları ayrık.
 * Protan, deutan ve tritan benzetiminde her çift ayrışır (testle korunur).
 */
const colorSafeLightTones: Record<SweetToneName, SweetTone> = {
  cobalt: { fill: "#8EC1F0", ink: "#0B2A4A" },
  teal: { fill: "#6FD2B4", ink: "#06372A" },
  coral: { fill: "#F7A877", ink: "#4A1A00" },
  saffron: { fill: "#F5E56E", ink: "#3A3200" },
  sage: { fill: "#ECEBE7", ink: "#33312D" },
  plum: { fill: "#E7A9CF", ink: "#4A1438" },
};

const colorSafeDarkTones: Record<SweetToneName, SweetTone> = {
  cobalt: { fill: "#142E4A", ink: "#C2DFFA" },
  teal: { fill: "#0F4A46", ink: "#B2EDE3" },
  coral: { fill: "#411900", ink: "#FFCBA8" },
  saffron: { fill: "#4F3E04", ink: "#F8E9A6" },
  sage: { fill: "#3A3F2A", ink: "#E3E6D6" },
  plum: { fill: "#351B2A", ink: "#F5CDE4" },
};

/** Açık ve koyu temanın renk körlüğüne uygun hâli: yalnız tonlar ve vurgu değişir. */
export const colorSafeThemes: Record<"light" | "dark", SweetTheme> = {
  light: { ...sweetThemes.light, tones: colorSafeLightTones, accent: colorSafeLightTones.coral, accentText: "#8F3500" },
  dark: { ...sweetThemes.dark, tones: colorSafeDarkTones, accent: colorSafeDarkTones.coral, accentText: "#FFBE92" },
};

/** Ekran teması: yüksek kontrast her şeyin önünde (ton zaten kullanmaz); sonra renk körlüğü seçeneği. */
export function resolveSweetTheme(mode: "light" | "dark", options: { highContrast: boolean; colorSafe: boolean }): SweetTheme {
  if (options.highContrast) return sweetThemes.highContrast;
  return options.colorSafe ? colorSafeThemes[mode] : sweetThemes[mode];
}

const byType: Record<string, SweetToneName> = {
  // Firuze ana renkle karışmasın diye camiler kobalt; çeşme ve sebil firuze.
  cami: "cobalt",
  medrese: "saffron",
  kutuphane: "saffron",
  turbe: "plum",
  cesme: "teal",
  sebil: "teal",
  hamam: "coral",
  imaret: "coral",
};

/** Eser türünün tonu. Renk tek başına anlam taşımaz; glif siluet farkını verir. */
export function toneForType(slug: string): SweetToneName {
  return byType[slug] ?? "sage";
}
