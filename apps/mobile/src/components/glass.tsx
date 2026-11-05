import { BlurTargetView, BlurView } from 'expo-blur';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { outline } from '@/design/sweet/components';
import { useSweetTheme } from '@/hooks/use-sweet-theme';

export type GlassToneName = 'light' | 'dark';

/** Cam içindeki yazı renkleri: cam tonuna göre (açık camda mürekkep, koyu camda krem). */
export interface GlassInk {
  tone: GlassToneName;
  text: string;
  muted: string;
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

function tintAlpha(tone: GlassToneName, alpha: number): number {
  if (Platform.OS !== 'android') return alpha;
  const overlay = (BLUR / 100) * ANDROID_TINT[tone];
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
}: {
  tone: GlassToneName;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  radius?: number;
}) {
  const t = useSweetTheme();
  const reduce = useReduceTransparency();
  const target = useContext(BlurTargetContext);
  const g = t.glass[tone];
  const solid = t.outlined || reduce;
  const canBlur = !solid && (Platform.OS !== 'android' || target != null);
  const alpha = solid ? 1 : canBlur ? tintAlpha(tone, g.alpha) : Math.max(g.alpha, FALLBACK_ALPHA);
  // Kenar çerçeve olarak kaba verilmez: konumlu katmanlar çerçevenin içinden başladığından ton kenarı örtmez ve
  // arkadaki fotoğraf çerçeveden sızar (koyu camda beyaz kenar). Işık çizgisi bu yüzden tonun üstüne ayrı katman olarak
  // çizilir ve yalnız açık camdadır; yüksek kontrastta çerçeve opak yüzeyin kendisindedir.
  const rim = !solid && tone === 'light';
  return (
    <GlassInkContext.Provider value={{ tone, text: g.text, muted: g.muted }}>
      {/* outline(t) yüksek kontrast dışında açıkça 0 çerçeve döner (Android'de çerçeve stili kalkınca içerik kayboluyordu). */}
      <View style={[{ borderRadius: radius, borderCurve: 'continuous', overflow: 'hidden' }, outline(t), style]}>
        {canBlur ? (
          <BlurView
            intensity={BLUR}
            blurReductionFactor={BLUR_REDUCTION}
            tint={tone === 'light' ? 'light' : 'dark'}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
            blurTarget={target ?? undefined}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: g.tint, opacity: alpha }]} />
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
