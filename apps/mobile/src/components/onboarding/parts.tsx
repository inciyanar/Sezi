import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Glass, GlassScope, GlassTarget } from '@/components/glass';
import { RichTitle } from '@/components/rich-title';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { BackIcon } from '@/design/icons';
import { outline, SoftPressable } from '@/design/sweet/components';
import { font, radius, space, type, upper } from '@/design/type';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useIsDark, useSweetTheme } from '@/hooks/use-sweet-theme';
import type { Lang } from '@/lib/i18n';

/** Taslaktaki geçiş eğrisi (`--ease`): yumuşak çıkışlı. */
export const obEase = Easing.bezier(0.2, 0.8, 0.2, 1);

/**
 * Kurulum sayfalarının cam tonu: Gece seçilince sayfa da koyu cama döner (tema renkleri koyu zemine göre ayarlı;
 * açık camda kalsaydı altın vurgu okunmazdı). Yüksek kontrastta açık.
 */
export function usePageTone(): 'light' | 'dark' {
  const t = useSweetTheme();
  const night = useIsDark();
  return night && !t.outlined ? 'dark' : 'light';
}

/**
 * Kurulum ekranlarının fotoğraf zemini: tam ekran fotoğraf ve üstten koyulaşan perde. Bulanıklaşan cam yüzeyler
 * bu fotoğrafı arkalarında görür (`GlassTarget`). Fotoğraf yoksa tema zemini kalır.
 */
export function ObBackdrop({ uri, shade = 'top', children }: { uri: string | undefined; shade?: 'top' | 'full' | 'none'; children?: ReactNode }) {
  const t = useSweetTheme();
  return (
    <GlassScope>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.text }]}>
        <GlassTarget style={StyleSheet.absoluteFill}>
          {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : null}
          {shade !== 'none' ? <Shade kind={shade} /> : null}
        </GlassTarget>
        {children}
      </View>
    </GlassScope>
  );
}

/** Fotoğraf üstündeki koyu perde: üstte durum çubuğu ve adım hapı okunsun, altta cam sayfa otursun. */
export function Shade({ kind }: { kind: 'top' | 'full' }) {
  const t = useSweetTheme();
  const ink = t.outlined ? t.text : t.glass.dark.tint;
  const stops = kind === 'top' ? [0.5, 0.05, 0.2] : [0.55, 0.05, 0.85];
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" accessible={false} pointerEvents="none">
      <Defs>
        <LinearGradient id={`ob-shade-${kind}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ink} stopOpacity={stops[0]} />
          <Stop offset="0.3" stopColor={ink} stopOpacity={stops[1]} />
          <Stop offset="1" stopColor={ink} stopOpacity={stops[2]} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#ob-shade-${kind})`} />
    </Svg>
  );
}

/** Adım göstergesi: koyu cam hap, geçilen ve o anki adımlar altın uzun çizgi (o anki girişte uzar). Ekran okuyucuya "Adım 2 / 6". */
export function StepDots({ n, total, label, lang }: { n: number; total: number; label: string; lang: Lang }) {
  const t = useSweetTheme();
  return (
    <Glass tone="dark" radius={radius.pill} style={s.dots}>
      <View style={s.dotRow} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 1, max: total, now: n }}>
        <View style={s.dotGroup} importantForAccessibility="no-hide-descendants">
          {Array.from({ length: total }, (_, i) => (
            <Dot key={i} on={i < n} current={i === n - 1} color={t.outlined ? t.glass.dark.text : t.gold.fill} off={t.glass.dark.muted} />
          ))}
        </View>
        <Text style={[type.tab, { color: t.glass.dark.text, letterSpacing: 1 }]}>{upper(label, lang)}</Text>
      </View>
    </Glass>
  );
}

function Dot({ on, current, color, off }: { on: boolean; current: boolean; color: string; off: string }) {
  const reduced = useReducedMotion();
  const wide = on ? 20 : 7;
  const width = useSharedValue(current && !reduced ? 7 : wide);
  useEffect(() => {
    width.set(reduced ? wide : withTiming(wide, { duration: 400, easing: obEase }));
  }, [wide, reduced, width]);
  const style = useAnimatedStyle(() => ({ width: width.get() }));
  return <Animated.View style={[s.dot, { backgroundColor: on ? color : off, opacity: on ? 1 : 0.45 }, style]} />;
}

/** Üstteki canlı önizleme kartı (258 dp): fotoğraf ya da koyu cam üstünde seçimin sonucunu gösterir. */
export function PreviewCard({
  label,
  lang,
  photo,
  dark,
  flash,
  children,
}: {
  label: string;
  lang: Lang;
  photo?: string;
  dark?: boolean;
  /** Duymayan profilin görsel ipucu: kartın çevresinde yanıp sönen altın çerçeve (hareket azaltmada sabit). */
  flash?: boolean;
  children?: ReactNode;
}) {
  const t = useSweetTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (flash && !reduced) pulse.set(withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1));
    else {
      cancelAnimation(pulse);
      pulse.set(flash ? 1 : 0);
    }
    return () => cancelAnimation(pulse);
  }, [flash, reduced, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <View style={s.previewShadow}>
      <View style={[s.preview, { backgroundColor: dark ? t.glass.dark.tint : t.soft }, outline(t)]}>
        <GlassScope>
          <GlassTarget style={StyleSheet.absoluteFill}>
            {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
          </GlassTarget>
          {children}
        </GlassScope>
        <Glass tone="dark" radius={radius.pill} style={s.previewLabel}>
          <Text style={[type.tab, { color: t.glass.dark.text, letterSpacing: 1.6 }]}>{upper(label, lang)}</Text>
        </Glass>
      </View>
      {flash ? <Animated.View pointerEvents="none" style={[s.flashRing, { borderColor: t.gold.fill }, ring]} /> : null}
    </View>
  );
}

/** Alttaki buzlu cam sayfa: soru, seçenekler ve gezinme. */
export function FrostPage({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Glass tone={usePageTone()} style={[s.page, style]}>
      {children}
    </Glass>
  );
}

export function Question({ text, size = 32 }: { text: string; size?: number }) {
  return <RichTitle text={text} style={{ fontFamily: font.serif, fontSize: size, lineHeight: size * 1.04, letterSpacing: -0.9 }} />;
}

export interface TileOption<T extends string> {
  value: T;
  label: string;
  icon: (color: string) => ReactNode;
}

/** Üç büyük karo (radyo grubu): seçili karo mürekkebe döner, 3 dp yükselir ve simgesi altın olur. */
export function Tiles<T extends string>({ options, value, onChange, label }: { options: TileOption<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={s.tiles} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => (
        <Tile key={o.value} option={o} on={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

function Tile<T extends string>({ option, on, onPress }: { option: TileOption<T>; on: boolean; onPress: () => void }) {
  const t = useSweetTheme();
  const ink = t.glass[usePageTone()];
  const reduced = useReducedMotion();
  const lift = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lift.set(reduced ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 300, easing: obEase }));
  }, [on, reduced, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.get() * -3 }] }));
  const fg = on ? t.primary.ink : ink.text;
  // Seçili simge altın; dolgu zaten altınsa (koyu tema) ya da yüksek kontrastta dolgunun yazı rengi.
  const iconColor = on ? (t.outlined || t.primary.fill === t.gold.fill ? t.primary.ink : t.gold.fill) : t.primaryText;
  return (
    <Animated.View style={[s.tileWrap, style]}>
      <SoftPressable
        onPress={() => {
          if (on) return;
          void Haptics.selectionAsync();
          onPress();
        }}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        accessibilityLabel={option.label}
        style={[
          s.tile,
          { backgroundColor: on ? t.primary.fill : `${t.surface}A6` },
          on && !t.outlined && { shadowColor: t.shadow, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
          outline(t),
          on && t.outlined && { borderWidth: 3 },
        ]}>
        {option.icon(iconColor)}
        <Text style={[type.bubble, { color: fg, textAlign: 'center', fontSize: 13.5 }]}>{option.label}</Text>
      </SoftPressable>
    </Animated.View>
  );
}

/** Seçimin etkisi: altın nokta + tek cümle; seçim değişince yumuşakça yenilenir. */
export function EffectLine({ text }: { text: string }) {
  const t = useSweetTheme();
  const ink = t.glass[usePageTone()];
  const reduced = useReducedMotion();
  const fade = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    fade.set(0);
    fade.set(withTiming(1, { duration: 300, easing: obEase }));
  }, [text, reduced, fade]);
  const style = useAnimatedStyle(() => ({ opacity: fade.get() }));
  return (
    <Animated.View style={[s.effect, style]} accessibilityLiveRegion="polite">
      <View style={[s.effectRing, { backgroundColor: `${t.gold.fill}33` }]}>
        <View style={[s.effectDot, { backgroundColor: t.gold.fill }]} />
      </View>
      <Text style={[type.meta, { color: ink.muted, flex: 1, fontSize: 14 }]}>{text}</Text>
    </Animated.View>
  );
}

/** Geri dairesi + ana düğme (mürekkep hap, altın ok). */
export function NavRow({ onBack, backLabel, onNext, nextLabel, disabled }: { onBack?: () => void; backLabel: string; onNext: () => void; nextLabel: string; disabled?: boolean }) {
  const t = useSweetTheme();
  const ink = t.glass[usePageTone()];
  return (
    <View style={s.nav}>
      {onBack ? (
        <SoftPressable onPress={onBack} accessibilityRole="button" accessibilityLabel={backLabel} style={[s.back, { backgroundColor: `${t.surface}B3` }, outline(t)]}>
          <BackIcon color={ink.text} size={20} />
        </SoftPressable>
      ) : null}
      <Button style={{ flex: 1 }} arrow label={nextLabel} onPress={onNext} disabled={disabled} />
    </View>
  );
}

/**
 * Ses dalgası: çubuklar sırayla kısalıp uzar (taslaktaki `wv`, 1,1 s). Hareket azaltmada çubuklar durur.
 * Dekoratif; sesin varlığını yanındaki yazı söyler.
 */
export function Waves({ heights, color, barWidth = 3, gap = 2, playing = true }: { heights: number[]; color: string; barWidth?: number; gap?: number; playing?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap, height: Math.max(...heights) }} importantForAccessibility="no-hide-descendants">
      {heights.map((h, i) => (
        <WaveBar key={i} height={h} width={barWidth} color={color} delay={i * 100} playing={playing} />
      ))}
    </View>
  );
}

function WaveBar({ height, width, color, delay, playing }: { height: number; width: number; color: string; delay: number; playing: boolean }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(1);
  useEffect(() => {
    if (!playing || reduced) {
      cancelAnimation(k);
      k.set(1);
      return;
    }
    k.set(withDelay(delay, withRepeat(withSequence(withTiming(0.3, { duration: 550 }), withTiming(1, { duration: 550 })), -1)));
    return () => cancelAnimation(k);
  }, [playing, reduced, delay, k]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: k.get() }] }));
  return <Animated.View style={[{ width, height, borderRadius: width, backgroundColor: color }, style]} />;
}

/** Sürekli hafif salınım (titreşim simgesi, ±10°, 0,4 s). Hareket azaltmada durur. */
export function Buzz({ children, playing }: { children: ReactNode; playing: boolean }) {
  const reduced = useReducedMotion();
  const r = useSharedValue(0);
  useEffect(() => {
    if (!playing || reduced) {
      cancelAnimation(r);
      r.set(0);
      return;
    }
    r.set(withRepeat(withSequence(withTiming(-10, { duration: 100 }), withTiming(10, { duration: 200 }), withTiming(0, { duration: 100 })), -1));
    return () => cancelAnimation(r);
  }, [playing, reduced, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.get()}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  dots: { flex: 1, height: 44, justifyContent: 'center', paddingHorizontal: space.lg },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { height: 7, borderRadius: 4 },
  previewShadow: { marginHorizontal: 16, height: 258, borderRadius: 30 },
  preview: { flex: 1, borderRadius: 30, borderCurve: 'continuous', overflow: 'hidden' },
  previewLabel: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 6 },
  flashRing: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 34, borderWidth: 4 },
  page: { borderTopLeftRadius: 34, borderTopRightRadius: 34, borderCurve: 'continuous', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30, gap: space.md },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tileWrap: { flex: 1 },
  tile: { minHeight: 112, borderRadius: 22, borderCurve: 'continuous', paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  effect: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  effectRing: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  effectDot: { width: 8, height: 8, borderRadius: 4 },
  nav: { flexDirection: 'row', gap: 8, marginTop: 2 },
  back: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
