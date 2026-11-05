import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/text';
import { font } from '@/design/type';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSweetTheme } from '@/hooks/use-sweet-theme';

import { obEase, usePageTone } from './parts';

const THUMB = 28;

/**
 * Kademeli kaydırıcı (taslaktaki "A ——— A"): sürüklenir ya da raya dokunulur, en yakın kademeye oturur.
 * Ekran okuyucuda ayarlanabilir öğedir (yukarı/aşağı kaydırma kademeyi değiştirir); her kademede seçim titreşimi.
 */
export function StepSlider<T extends string>({
  values,
  labels,
  value,
  onChange,
  label,
}: {
  values: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const t = useSweetTheme();
  const ink = t.glass[usePageTone()];
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, values.indexOf(value));
  const last = Math.max(1, values.length - 1);
  const x = useSharedValue(0);
  const track = width - THUMB;

  useEffect(() => {
    if (track <= 0) return;
    const target = (index / last) * track;
    x.set(reduced ? target : withTiming(target, { duration: 200, easing: obEase }));
  }, [index, last, track, reduced, x]);

  const pick = (i: number) => {
    const next = values[Math.max(0, Math.min(values.length - 1, i))];
    if (next === undefined) return;
    // Aynı kademeye bırakılınca başparmak yerine döner.
    if (next === value) {
      const target = (index / last) * track;
      x.set(reduced ? target : withTiming(target, { duration: 150 }));
      return;
    }
    void Haptics.selectionAsync();
    onChange(next);
  };

  // Dokunulan nokta da sayılır (raya tek dokunuş kademeyi seçer); bırakınca en yakın kademeye oturur.
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      if (track <= 0) return;
      x.set(Math.max(0, Math.min(track, e.x - THUMB / 2)));
    })
    .onUpdate((e) => {
      if (track <= 0) return;
      x.set(Math.max(0, Math.min(track, e.x - THUMB / 2)));
    })
    .onFinalize(() => {
      if (track <= 0) return;
      scheduleOnRN(pick, Math.round((x.get() / track) * last));
    });

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const fill = useAnimatedStyle(() => ({ width: x.get() }));

  return (
    <View
      style={s.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: labels[value] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => pick(index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}>
      <Text style={{ fontFamily: font.serif, fontSize: 14, color: ink.muted }} importantForAccessibility="no">
        A
      </Text>
      <GestureDetector gesture={pan}>
        <View style={s.hit} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
          <View style={[s.rail, { backgroundColor: `${ink.text}26` }]} />
          <Animated.View style={[s.fill, { backgroundColor: t.primary.fill }, fill]} />
          {values.map((v, i) => (
            <View
              key={v}
              style={[
                s.tick,
                { left: track > 0 ? (i / last) * track + THUMB / 2 - 3 : 0, backgroundColor: i <= index ? t.primary.fill : `${ink.text}55` },
              ]}
            />
          ))}
          <Animated.View style={[s.thumb, { backgroundColor: t.primary.fill, borderColor: t.surface }, thumb]} />
        </View>
      </GestureDetector>
      <Text style={{ fontFamily: font.serif, fontSize: 26, color: ink.muted }} importantForAccessibility="no">
        A
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  hit: { flex: 1, height: 48, justifyContent: 'center' },
  rail: { position: 'absolute', left: THUMB / 2, right: THUMB / 2, height: 4, borderRadius: 2 },
  fill: { position: 'absolute', left: THUMB / 2, height: 4, borderRadius: 2 },
  tick: { position: 'absolute', width: 6, height: 6, borderRadius: 3, top: 21 },
  thumb: { position: 'absolute', left: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: 3 },
});
