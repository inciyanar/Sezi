import { GLASS_THIN_ALPHA, GLASS_VEIL_ALPHA } from '@sezi/shared';
import { BlurTargetView, BlurView } from 'expo-blur';
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { outline } from '@/design/sweet/components';
import { useSweetTheme } from '@/hooks/use-sweet-theme';

export type GlassToneName = 'light' | 'dark';

/** Cam içindeki yazı renkleri: cam tonuna göre (açık camda mürekkep, koyu camda krem). */
export interface GlassInk {
  tone: GlassToneName;
  text: string;
  muted: string;
  /** Puslu (ince) cam: yazı blokları `GlassVeil` ile pus üstüne konur. */
  veil: boolean;
}

const GlassInkContext = createContext<GlassInk | null>(null);
const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

/** Bulunulan camın yazı renkleri; cam dışında `null` (çağıran tema rengini kullanır). */
export function useGlassInk(): GlassInk | null {
  return useContext(GlassInkContext);
}

/** iOS "Saydamlığı azalt" ayarı; Android'de her zaman `false`. */
function useReduceTransparency(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((v) => alive && setOn(v));
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

/**
 * Camın bulanıklaştıracağı arka planın kapsamı. Android'de bulanıklık yalnız `GlassTarget` içindeki görüntüye
 * uygulanır: fotoğraf `GlassTarget` içine, cam ise onun kardeşi olarak aynı `GlassScope` içine konur.
 * Cam `GlassTarget`'ın içine konmaz (kendini bulanıklaştırır).
 */
export function GlassScope({ children }: { children: ReactNode }) {
  const ref = useRef<View | null>(null);
  return <BlurTargetContext.Provider value={ref}>{children}</BlurTargetContext.Provider>;
}

/** Bulanıklaştırılacak arka plan (fotoğraf, harita). `GlassScope` dışında düz `View` gibi davranır. */
export function GlassTarget({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useContext(BlurTargetContext);
  if (!ref) return <View style={style}>{children}</View>;
  // Hedefin kendi içindeki alt bileşenler üstteki hedefi bulanıklaştırmamalı (Android'de döngüsel çizim çökmesi).
  return (
    <BlurTargetView ref={ref} style={style}>
      <BlurTargetContext.Provider value={null}>{children}</BlurTargetContext.Provider>
    </BlurTargetView>
  );
}

/** Bulanıklık çizilemeyen yerde (Android'de hedefsiz cam) yazının okunması için cam koyulaşır. */
const FALLBACK_ALPHA = 0.92;
/** Bulanıklık gücü (1–100). Android'de yarıçap `BLUR / BLUR_REDUCTION` olur; 25 maketteki 26 px buzlanmaya yakın. */
const BLUR = 40;
const BLUR_REDUCTION = 1.6;
/**
 * expo-blur Android'de bulanıklığın üstüne kendi tonunu (`BLUR/100 × katsayı` opaklıkta) serer. Toplam opaklık tema
 * değerinde (`g.alpha`, kontrast testi bunu korur) kalsın diye bizim ton katmanı bu kadar inceltilir.
 */
const ANDROID_TINT = { light: 0.78, dark: 0.69 } as const;
/**
 * Puslu (ince) cam: hafif bulanıklık (Android yarıçapı `BLUR_THIN / BLUR_THIN_REDUCTION` ≈ 12); fotoğraf camın
 * arkasından açıkça görünür. expo-blur'un kendi tonu (`BLUR_THIN/100 × 0.78` ≈ 0,16) camın toplam opaklığını
 * (`GLASS_THIN_ALPHA`) aşmasın diye yoğunluk 20'de kalır.
 */
const BLUR_THIN = 20;
const BLUR_THIN_REDUCTION = 1.6;
/** Pusun yazı bloğunun üstünden ve altından solarak taştığı mesafe. */
const VEIL_FEATHER = 28;
/** Buzlu camın kumlu dokusu: 128 px gürültü 64 dp'ye sığdırılır (ince tane; açık/koyu nokta, düşük opaklık). */
const GRAIN = require('../../assets/images/grain.png');
const GRAIN_TILE = 64;

/** Doku karoları elle döşenir: Android'de `resizeMode="repeat"` tam boy kapta tek karo çiziyor. */
function Grain() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cols = Math.ceil(size.w / GRAIN_TILE);
  const rows = Math.ceil(size.h / GRAIN_TILE);
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, grainStyles.clip]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* Satır tam karo genişliğinde: son karo kenardan taşar ve kırpılır, alt satıra kaymaz. */}
      <View style={[grainStyles.grid, { width: cols * GRAIN_TILE }]}>
        {Array.from({ length: cols * rows }, (_, i) => (
          <Image key={i} source={GRAIN} style={grainStyles.tile} accessible={false} />
        ))}
      </View>
    </View>
  );
}

const grainStyles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: GRAIN_TILE, height: GRAIN_TILE },
});

function tintAlpha(tone: GlassToneName, alpha: number, intensity: number): number {
  if (Platform.OS !== 'android') return alpha;
  const overlay = (intensity / 100) * ANDROID_TINT[tone];
  return Math.max(0, 1 - (1 - alpha) / (1 - overlay));
}

/**
 * Buzlu cam yüzeyi: arkadaki fotoğraf bulanıklaşır, üstüne tema cam tonu (`t.glass`) serilir. Saydamlık en kötü
 * fotoğrafta da yazıyı AA'da tutar (`sweet-theme.test.ts`). Yüksek kontrastta ve "Saydamlığı azalt" açıkken
 * bulanıklık çizilmez, yüzey opak olur ve çerçeve alır. Android'de bulanıklık yalnız `GlassScope` içinde çalışır;
 * dışında cam bulanıksız ve daha koyu çizilir.
 */
export function Glass({
  tone,
  style,
  children,
  radius = 0,
  thin = false,
}: {
  tone: GlassToneName;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  radius?: number;
  /** Yalnız açık camda: puslu cam. Neredeyse saydam, hafif bulanık ve kumlu; yazılar `GlassVeil` pusunun üstüne konur. */
  thin?: boolean;
}) {
  const t = useSweetTheme();
  const reduce = useReduceTransparency();
  const target = useContext(BlurTargetContext);
  const g = t.glass[tone];
  const solid = t.outlined || reduce;
  const canBlur = !solid && (Platform.OS !== 'android' || target != null);
  const isThin = thin && tone === 'light' && canBlur;
  const intensity = isThin ? BLUR_THIN : BLUR;
  const base = isThin ? Math.min(g.alpha, GLASS_THIN_ALPHA) : g.alpha;
  const alpha = solid ? 1 : canBlur ? tintAlpha(tone, base, intensity) : Math.max(g.alpha, FALLBACK_ALPHA);
  const muted = isThin ? g.text : g.muted;
  // Kenar çerçeve olarak kaba verilmez: konumlu katmanlar çerçevenin içinden başladığından ton kenarı örtmez ve
  // arkadaki fotoğraf çerçeveden sızar (koyu camda beyaz kenar). Işık çizgisi bu yüzden tonun üstüne ayrı katman olarak
  // çizilir ve yalnız açık camdadır; yüksek kontrastta çerçeve opak yüzeyin kendisindedir. Puslu camın kenarı yalındır.
  const rim = !solid && tone === 'light' && !isThin;
  return (
    <GlassInkContext.Provider value={{ tone, text: g.text, muted, veil: isThin }}>
      {/* outline(t) yüksek kontrast dışında açıkça 0 çerçeve döner (Android'de çerçeve stili kalkınca içerik kayboluyordu). */}
      <View style={[{ borderRadius: radius, borderCurve: 'continuous', overflow: 'hidden' }, outline(t), style]}>
        {canBlur ? (
          <BlurView
            intensity={intensity}
            blurReductionFactor={isThin ? BLUR_THIN_REDUCTION : BLUR_REDUCTION}
            tint={tone === 'light' ? 'light' : 'dark'}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
            blurTarget={target ?? undefined}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: g.tint, opacity: alpha }]} />
        {isThin ? <Grain /> : null}
        {rim ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: radius, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: `${t.onPhoto.text}8C` },
            ]}
          />
        ) : null}
        {children}
      </View>
    </GlassInkContext.Provider>
  );
}

/**
 * Puslu camda yazı bloğunun arkasına serilen pus: camın ton renginde, bloğun üstünden ve altından `VEIL_FEATHER` kadar
 * solarak taşar, yanlarda camın kenarına kadar uzanır (`bleed`: camın yatay iç boşluğu). Yazı her zaman pusun düz
 * bölgesindedir; okunurluk `GLASS_VEIL_ALPHA` ile en kötü zeminde AA'dır. Puslu cam dışında düz `View` gibi davranır.
 */
export function GlassVeil({ children, bleed, style }: { children: ReactNode; bleed: number; style?: StyleProp<ViewStyle> }) {
  const t = useSweetTheme();
  const ink = useGlassInk();
  const id = useId();
  const [height, setHeight] = useState(0);
  if (!ink?.veil) return <View style={style}>{children}</View>;
  const tint = t.glass.light.tint;
  // Solma payı ölçülen bloğa göre oran: düz bölge tam olarak yazı bloğunu kaplar.
  const edge = VEIL_FEATHER / (height + VEIL_FEATHER * 2);
  return (
    <View style={style} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -VEIL_FEATHER, bottom: -VEIL_FEATHER, left: -bleed, right: -bleed }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1 100" accessible={false}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tint} stopOpacity={0} />
              <Stop offset={edge} stopColor={tint} stopOpacity={GLASS_VEIL_ALPHA} />
              <Stop offset={1 - edge} stopColor={tint} stopOpacity={GLASS_VEIL_ALPHA} />
              <Stop offset="1" stopColor={tint} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="1" height="100" fill={`url(#${id})`} />
        </Svg>
      </View>
      {children}
    </View>
  );
}
