import { MASCOT, MASCOT_GRID_COLUMNS } from '@sezi/shared';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { MASCOT_SHEET_NAMES, MascotPlayer } from '@/components/mascot-player';
import { SoftPressable } from '@/design/sweet/components';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** Izgaralar `data/build_mascot.py` ile üretilir (kare sayısı, 6 sütun); katman sırası `MASCOT_SHEET_NAMES`. */
const SHEETS = {
  oturma: { source: require('../../assets/maskot/oturma.webp'), frames: 24 },
  sevilme: { source: require('../../assets/maskot/sevilme.webp'), frames: 16 },
  kitap: { source: require('../../assets/maskot/kitap.webp'), frames: 24 },
  yanit_yok: { source: require('../../assets/maskot/yanit_yok.webp'), frames: 12 },
} as const;

const [CELL_W, CELL_H] = MASCOT.cell;
/** Kedinin karedeki hareket alanı (288 x 224 hücrede); çizim yalnız bu bölgeyi gösterir, boş kenarlar kesilir. */
const BOUNDS = { x: 42, y: 54, width: 204, height: 150 };

export type MascotHandle = {
  /** Cevap aranıyor: kitabı açar, cevap gelene kadar sayfa karıştırır. */
  setThinking: (value: boolean) => void;
  /** Cevap verilemedi: kulaklar ve baş eğik bekler; yeni soru ya da sohbet sıfırlanınca kalkar. */
  setSad: (value: boolean) => void;
  /** Dokunma ya da güzel bir cevap: bir süre mutlu. */
  petFor: (ms: number) => void;
};

/**
 * Sezi maskotu (web `mascot-player.ts` ile aynı durumlar, dolaşma hariç). Kare değişimi yalnız paylaşılan değere
 * yazılır; React her karede yeniden çizmez. Hareket azaltmada oynamaz, durum sabit pozla gösterilir.
 */
export function Mascot({ width, label, ref }: { width: number; label: string; ref?: Ref<MascotHandle> }) {
  const reduced = useReducedMotion();
  const sheet = useSharedValue(0);
  const frame = useSharedValue(0);
  const player = useRef<MascotPlayer | null>(null);
  player.current ??= new MascotPlayer((s, f) => {
    sheet.set(s);
    frame.set(f);
  });

  useEffect(() => {
    const p = player.current;
    p?.setReduced(reduced);
    return () => p?.stop();
  }, [reduced]);
  useImperativeHandle(ref, () => ({
    setThinking: (v) => player.current?.setThinking(v),
    setSad: (v) => player.current?.setSad(v),
    petFor: (ms) => player.current?.petFor(ms),
  }), []);

  const scale = width / BOUNDS.width;
  const height = Math.round(BOUNDS.height * scale);
  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync();
        player.current?.petFor(4000);
      }}
      style={{ width, height }}>
      <View style={[styles.window, { width, height }]}>
        {MASCOT_SHEET_NAMES.map((name, index) => (
          <Sheet key={name} index={index} source={SHEETS[name].source} rows={Math.ceil(SHEETS[name].frames / MASCOT_GRID_COLUMNS)} scale={scale} sheet={sheet} frame={frame} />
        ))}
      </View>
    </SoftPressable>
  );
}

function Sheet({ index, source, rows, scale, sheet, frame }: { index: number; source: number; rows: number; scale: number; sheet: SharedValue<number>; frame: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const f = frame.get();
    const col = f % MASCOT_GRID_COLUMNS;
    const row = Math.floor(f / MASCOT_GRID_COLUMNS);
    return {
      opacity: sheet.get() === index ? 1 : 0,
      transform: [{ translateX: -(col * CELL_W + BOUNDS.x) * scale }, { translateY: -(row * CELL_H + BOUNDS.y) * scale }],
    };
  });
  return (
    <Animated.View style={[styles.sheet, style]}>
      <Image source={source} style={{ width: MASCOT_GRID_COLUMNS * CELL_W * scale, height: rows * CELL_H * scale }} contentFit="fill" accessible={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
  sheet: { position: 'absolute', left: 0, top: 0 },
});
