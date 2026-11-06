import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { SeziLoader } from '@/components/sezi-loader';
import { duration, ease, refreshSpring } from '@/design/sweet/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useT } from '@/lib/i18n';

const LOADER = 64;
/** Yenilenirken sayfanın durduğu yer: durum çubuğunun altında göstergeye yer açar. */
const LOADER_ROOM = LOADER + 24;
/** Sınıra çarpmak yerine direnci artan lastik bant: çekme bu değere asimptotik yaklaşır. */
const RUBBER_BAND = 220;
/** Önbellekten yenileme anında bitebiliyor; çizim en az bu kadar görünür kalır, yoksa kullanıcı bir şey olduğunu görmez. */
const MIN_VISIBLE_MS = 900;

/**
 * Aşağı çekerek yenileme: liste, üstteki esneyen fotoğraf ve gösterge aynı UI-worklet değerini izler. Parmak hareketi
 * JS state'ine taşınmaz; yalnız eşik geçilince yenileme RN tarafına bildirilir. Liste başta değilken çekme etkinleşmez.
 * Listeye `overScrollMode="never"` verilmeli: Android'in esneme efekti tepedeki sürüklemeyi kendine alır.
 *
 * `stretchHeight`: listenin ilk bölümündeki fotoğrafın yüksekliği. `stretchStyle` o fotoğrafa verilir: alt kenarı
 * yerinde kalarak yukarı büyür. Kaydırıcı kendi çerçevesinin üstünü kırptığı için açılan boşluğu aynı fotoğrafın
 * listenin arkasındaki kopyası (`backdropStyle`) doldurur; iki katman ekranda aynı yere düşer, dikiş görünmez.
 */
export function useSeziRefresh(refetch: () => void | Promise<unknown>, { stretchHeight }: { stretchHeight: number }) {
  const { t: tr } = useT();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const pull = useSharedValue(0);
  const armed = useSharedValue(false);
  const busy = useSharedValue(false);
  const resting = insets.top + LOADER_ROOM;
  const threshold = resting * 0.8;

  const beginRefresh = useCallback(() => {
    setRefreshing(true);
    AccessibilityInfo.announceForAccessibility(tr('common.loading'));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { promise: shown, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, MIN_VISIBLE_MS);
    void Promise.allSettled([refetch(), shown]).then(() => setRefreshing(false));
  }, [refetch, tr]);

  useEffect(() => {
    busy.set(refreshing);
    if (!refreshing) {
      pull.set(reduced ? withTiming(0, { duration: duration.release, easing: ease.out }) : withSpring(0, refreshSpring));
    }
  }, [refreshing, reduced, busy, pull]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.set(event.contentOffset.y);
    },
  });

  // Liste (gesture-handler `FlatList`) bu ref'i `simultaneousHandlers` ile alır: kaydırma ve çekme birbirini iptal etmez.
  const panRef = useRef<GestureType | undefined>(undefined);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        // `withRef` ref'i yalnız jest kaydına bağlar, render'da `.current` okumaz (gesture-handler'ın belgelenmiş yolu).
        // eslint-disable-next-line react-hooks/refs
        .withRef(panRef)
        .activeOffsetY(8)
        .onBegin(() => {
          armed.set(scrollY.get() <= 0);
        })
        .onUpdate((event) => {
          if (!armed.get() || busy.get()) return;
          const distance = Math.max(0, event.translationY);
          pull.set(RUBBER_BAND * (1 - 1 / (1 + distance / RUBBER_BAND)));
        })
        .onEnd((event) => {
          if (!armed.get() || busy.get()) return;
          armed.set(false);
          const target = pull.get() >= threshold ? resting : 0;
          if (target > 0) {
            busy.set(true);
            scheduleOnRN(beginRefresh);
          }
          pull.set(reduced ? withTiming(target, { duration: duration.release, easing: ease.out }) : withSpring(target, { ...refreshSpring, velocity: event.velocityY, overshootClamping: true }));
        })
        .onFinalize(() => {
          armed.set(false);
          if (!busy.get() && pull.get() > 0) {
            pull.set(reduced ? withTiming(0, { duration: duration.release, easing: ease.out }) : withSpring(0, refreshSpring));
          }
        }),
    [armed, busy, pull, scrollY, reduced, beginRefresh, threshold, resting],
  );

  const listStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : pull.get() }],
  }));
  // Alt kenar sabit (`transformOrigin: 'bottom'`), fotoğraf ekranın üstüne kadar uzar.
  const stretchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: (stretchHeight + (reduced ? 0 : pull.get())) / stretchHeight }],
  }));
  // Liste kadar kayar ve aynı oranda esner; yalnız çekilirken görünür, yoksa kaydırılan listenin arkasından sızardı.
  const backdropStyle = useAnimatedStyle(() => {
    const p = reduced ? 0 : pull.get();
    return {
      opacity: p > 0.5 ? 1 : 0,
      transform: [{ translateY: p }, { scale: (stretchHeight + p) / stretchHeight }],
    };
  });
  // Gösterge, açılan boşluğun ortasında sayfa kenarıyla birlikte iner; çekme ilerledikçe belirir ve döner.
  const overlayStyle = useAnimatedStyle(() => {
    const p = pull.get();
    const progress = Math.max(0, Math.min(1, p / threshold));
    const y = reduced ? insets.top + (LOADER_ROOM - LOADER) / 2 : insets.top + (p - insets.top - LOADER) / 2;
    return {
      opacity: interpolate(progress, [0.25, 1], [0, 1], 'clamp'),
      transform: [{ translateY: y }, { rotate: `${reduced ? 0 : progress * 270}deg` }, { scale: reduced ? 1 : 0.85 + progress * 0.15 }],
    };
  });

  const overlay = (
    <View
      pointerEvents="none"
      accessibilityElementsHidden={!refreshing}
      importantForAccessibility={refreshing ? 'auto' : 'no-hide-descendants'}
      style={styles.overlay}>
      <Animated.View style={overlayStyle}>
        <SeziLoader size={LOADER} active={refreshing} />
      </Animated.View>
    </View>
  );

  return { pan, panRef, onScroll, listStyle, stretchStyle, backdropStyle, overlay };
}

const styles = StyleSheet.create({
  // Ekran boyu: gösterge kaydıkça kapsayıcının dışına taşıp kırpılmaz.
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
});
