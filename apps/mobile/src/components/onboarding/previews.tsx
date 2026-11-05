import { INTEREST_BADGES, loc, PROFILE_INTERESTS, sweetThemes, type BadgeId, type PlannedRoute, type UserProfile, type WorkRow } from '@sezi/shared';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { Glass } from '@/components/glass';
import { BadgeArt } from '@/components/social-visuals';
import { Text } from '@/components/text';
import { VibrateIcon } from '@/design/sense-icons';
import { font, space, type, upper } from '@/design/type';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import type { Lang } from '@/lib/i18n';
import { pilotStreets } from '@/lib/nav';

import { Buzz, obEase, Waves } from './parts';

type Mobility = UserProfile['mobility'];
const MOBILITIES: readonly Mobility[] = ['none', 'cane', 'wheelchair'];

/** Önizlemedeki eserin alt satırı: ilçe · tür. */
function workMeta(work: WorkRow, lang: Lang): string {
  return [work.district, loc(work.type_name, lang)].filter(Boolean).join(' · ');
}

/**
 * Görünüm ve görme önizlemesi: eser fotoğrafının solunda buzlu cam yarım (ad, ilçe · tür, yıl). "Az görüyorum"
 * yarımı tüm karta genişletir ve yazıyı büyütür; "Görmüyorum" kartı karartıp sesli rehberin gerçek cümlesini gösterir.
 * Gece modunda yarım koyu camdır. Yazılar uygulamanın yazı boyu ayarıyla birlikte büyür.
 */
export function WorkPreview({
  work,
  lang,
  night,
  vision = 'full',
  guide,
  guideLabel,
}: {
  work: WorkRow | undefined;
  lang: Lang;
  night: boolean;
  vision?: UserProfile['vision'];
  guide?: string;
  guideLabel: string;
}) {
  const t = useSweetTheme();
  const reduced = useReducedMotion();
  const wide = useSharedValue(vision === 'low' ? 1 : 0);
  useEffect(() => {
    const target = vision === 'low' ? 1 : 0;
    wide.set(reduced ? target : withTiming(target, { duration: 400, easing: obEase }));
  }, [vision, reduced, wide]);
  const split = useAnimatedStyle(() => ({ width: `${54 + wide.get() * 46}%` }));
  const tone = night && !t.outlined ? 'dark' : 'light';
  const ink = t.glass[tone];
  const low = vision === 'low';
  const blindInk = t.outlined ? t.background : t.gold.fill;
  if (!work) return null;
  return (
    <>
      <Animated.View style={[s.splitBox, split]}>
        <Glass tone={tone} style={[StyleSheet.absoluteFill, s.split, low && { paddingTop: 52 }]}>
          <View>
            <Text style={{ fontFamily: font.serif, fontSize: low ? 38 : 26, lineHeight: low ? 40 : 27, letterSpacing: -0.5, color: ink.text }}>
              {loc(work.name, lang)}
            </Text>
            <Text style={[type.meta, { fontSize: low ? 16 : 12, lineHeight: low ? 21 : 16, color: ink.muted, marginTop: 6 }]}>{workMeta(work, lang)}</Text>
          </View>
          {work.built_year ? (
            <Text style={{ fontFamily: font.serif, fontSize: low ? 34 : 28, lineHeight: low ? 36 : 30, textAlign: 'right', color: ink.text }}>
              {work.built_year}
            </Text>
          ) : null}
        </Glass>
      </Animated.View>
      {vision === 'blind' ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(400)}
          exiting={reduced ? undefined : FadeOut.duration(300)}
          style={[StyleSheet.absoluteFill, s.blind, { backgroundColor: t.outlined ? t.text : sweetThemes.dark.background }]}>
          <Text style={[type.tab, { color: blindInk, letterSpacing: 2 }]}>{upper(guideLabel, lang)}</Text>
          <Waves heights={[20, 40, 28, 52, 24, 44, 18]} color={blindInk} barWidth={5} gap={4} />
          {guide ? (
            <Text style={{ fontFamily: font.serif, fontSize: 20, lineHeight: 25, textAlign: 'center', color: t.outlined ? t.background : t.onPhoto.text }}>
              “{guide}”
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
    </>
  );
}

/**
 * İşitme önizlemesi: koyu cam şeritte yönlendirme cümlesi. Az duyan için yazı büyür, dalga söner; duymayan için dalga
 * yerine sallanan titreşim simgesi (kartın çevresindeki yanıp sönen çerçeve `PreviewCard flash` ile).
 */
export function HearPreview({ hearing, text }: { hearing: UserProfile['hearing']; text: string }) {
  const t = useSweetTheme();
  const reduced = useReducedMotion();
  const soft = useSharedValue(hearing === 'hard' ? 1 : 0);
  useEffect(() => {
    const target = hearing === 'hard' ? 1 : 0;
    soft.set(reduced ? target : withTiming(target, { duration: 300, easing: obEase }));
  }, [hearing, reduced, soft]);
  const wave = useAnimatedStyle(() => ({ opacity: 1 - soft.get() * 0.6, transform: [{ scale: 1 - soft.get() * 0.3 }] }));
  const big = hearing !== 'full';
  const accent = t.outlined ? t.glass.dark.text : t.gold.fill;
  return (
    <Glass tone="dark" radius={22} style={s.hear}>
      {hearing === 'deaf' ? (
        <Buzz playing>
          <VibrateIcon color={accent} size={30} />
        </Buzz>
      ) : (
        <Animated.View style={wave}>
          <Waves heights={[10, 22, 14, 26, 12]} color={accent} />
        </Animated.View>
      )}
      <Text style={[big ? type.itemTitle : type.meta, { color: t.glass.dark.text, flex: 1, fontSize: big ? 17 : 14, lineHeight: big ? 22 : 19 }]}>{text}</Text>
    </Glass>
  );
}

/** Kenar boşluğu; üstte "Canlı önizleme" etiketi, altta istatistik şeridi için ayrıca yer bırakılır. */
const PAD = 24;
const TOP = 50;
const STAT_H = 100;

/**
 * Hareket önizlemesi: pilot alanın gerçek yaya ağı üstünde üç profilin gerçek rotası. Seçilen profilin rotası belirir;
 * altta o rotanın basamaklı geçiş sayısı ve uzunluğu. Başlangıç firuze, varış altın.
 */
export function MovePreview({ routes, mobility, target, stat }: { routes: Record<Mobility, PlannedRoute | null>; mobility: Mobility; target: string; stat: string | null }) {
  const t = useSweetTheme();
  const reduced = useReducedMotion();
  const dark = sweetThemes.dark;
  // Çizim kartın gerçek ölçüsüne göre yapılır (kırpma yok): rota uçları etikete ve şeride binmez.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const shape = useMemo(() => {
    if (!size) return null;
    const { w: W, h: H } = size;
    const points = MOBILITIES.flatMap((k) => routes[k]?.geometry.line ?? []);
    if (points.length === 0) return null;
    const lat0 = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    const kx = Math.cos((lat0 * Math.PI) / 180);
    const xs = points.map((p) => p[0] * kx);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const boxH = H - TOP - STAT_H;
    const scale = Math.min((W - PAD * 2) / Math.max(maxX - minX, 1e-9), boxH / Math.max(maxY - minY, 1e-9));
    const ox = (W - (maxX - minX) * scale) / 2;
    const oy = TOP + (boxH - (maxY - minY) * scale) / 2;
    const project = (p: readonly number[]): [number, number] => [ox + ((p[0] ?? 0) * kx - minX) * scale, oy + (maxY - (p[1] ?? 0)) * scale];
    const path = (line: readonly (readonly number[])[]) =>
      line
        .map((p, i) => {
          const [x, y] = project(p);
          return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join('');
    // Görünen kutunun içine düşen sokaklar (biraz taşanlar da) silik zemin olarak çizilir.
    const inside = (p: readonly number[]) => {
      const [x, y] = project(p);
      return x > -40 && x < W + 40 && y > -40 && y < H + 40;
    };
    const streets = pilotStreets.filter((segment) => segment.geometry.some(inside)).map((segment) => path(segment.geometry)).join('');
    const byProfile: Record<Mobility, string | null> = { none: null, cane: null, wheelchair: null };
    const stairMarkers: Record<Mobility, [number, number][]> = { none: [], cane: [], wheelchair: [] };
    for (const k of MOBILITIES) {
      const line = routes[k]?.geometry.line;
      byProfile[k] = line ? path(line) : null;
      const segmentIds = new Set(routes[k]?.route.segmentIds ?? []);
      for (const segment of pilotStreets) {
        if (segment.steps <= 0 || !segmentIds.has(segment.id)) continue;
        const center = segment.geometry[Math.floor(segment.geometry.length / 2)];
        if (center) stairMarkers[k].push(project(center));
      }
    }
    const first = MOBILITIES.map((k) => routes[k]).find((r): r is PlannedRoute => r !== null);
    const line = first?.geometry.line ?? [];
    const start = line[0] ? project(line[0]) : null;
    const end = line[line.length - 1] ? project(line[line.length - 1] ?? [0, 0]) : null;
    return { streets, byProfile, stairMarkers, start, end };
  }, [routes, size]);
  const selected = shape?.byProfile[mobility];
  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {shape ? (
        <Svg style={StyleSheet.absoluteFill} width={size?.w} height={size?.h} accessible={false}>
          <Path d={shape.streets} stroke={dark.onPhoto.text} strokeOpacity={0.16} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {selected ? <AnimatedRoute key={mobility} d={selected} color={dark.onPhoto.text} animate={!reduced} /> : null}
          {shape.stairMarkers[mobility].map(([x, y], i) => (
            <G key={i} transform={`translate(${x} ${y})`}>
              <Circle r={11} fill={t.gold.fill} stroke={dark.background} strokeWidth={2} />
              <Path d="M-6 5h4V1h4v-4h4" fill="none" stroke={t.gold.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
            </G>
          ))}
          {shape.start ? <Circle cx={shape.start[0]} cy={shape.start[1]} r={8} fill={dark.tones.teal.ink} stroke={dark.onPhoto.text} strokeWidth={3} /> : null}
          {shape.end ? <Circle cx={shape.end[0]} cy={shape.end[1]} r={10} fill={t.gold.fill} stroke={dark.onPhoto.text} strokeWidth={3} /> : null}
        </Svg>
      ) : null}
      <Glass tone="light" radius={18} style={s.stat}>
        <Text style={[type.meta, { color: t.glass.light.muted, fontSize: 12, lineHeight: 16 }]} numberOfLines={1}>
          {target}
        </Text>
        {stat ? <Text style={{ fontFamily: font.serif, fontSize: 20, lineHeight: 24, color: t.glass.light.text }}>{stat}</Text> : null}
      </Glass>
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Seçilen rota 400 ms'de belirir (taslaktaki geçiş); hareket azaltmada anında. */
function AnimatedRoute({ d, color, animate }: { d: string; color: string; animate: boolean }) {
  const o = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) o.set(withTiming(1, { duration: 400, easing: obEase }));
  }, [animate, o]);
  const props = useAnimatedProps(() => ({ opacity: o.get() }));
  return <AnimatedPath d={d} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" animatedProps={props} />;
}

/** İlgi önizlemesi: altı hedef damga; seçilen ilginin damgası renklenip büyür, diğerleri soluk ve küçük. */
export function InterestPreview({ selected }: { selected: readonly string[] }) {
  return (
    <View style={s.badges} importantForAccessibility="no-hide-descendants">
      {PROFILE_INTERESTS.map((k) => (
        <BadgeGoal key={k} id={INTEREST_BADGES[k]} on={selected.includes(k)} />
      ))}
    </View>
  );
}

function BadgeGoal({ id, on }: { id: BadgeId; on: boolean }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    k.set(reduced ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 400, easing: obEase }));
  }, [on, reduced, k]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + k.get() * 0.65, transform: [{ scale: 0.85 + k.get() * 0.15 }] }));
  return (
    // Seçilmeyen hedef gri (taslaktaki grayscale); Android 12 öncesinde filtre yok sayılır, soluklaşma yine görünür.
    <Animated.View style={[s.badgeCell, style, !on && { filter: [{ grayscale: 1 }] }]}>
      <BadgeArt id={id} size={76} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  splitBox: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  split: { paddingTop: 22, paddingRight: 16, paddingBottom: 18, paddingLeft: 20, justifyContent: 'space-between' },
  blind: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: space.xl },
  hear: { position: 'absolute', left: 16, right: 16, bottom: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat: { position: 'absolute', left: 14, right: 14, bottom: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 2 },
  badges: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', paddingTop: 34, paddingHorizontal: 12, paddingBottom: 14, rowGap: 10 },
  badgeCell: { width: '33.33%', alignItems: 'center' },
});
