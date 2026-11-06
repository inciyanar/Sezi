import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { duration, ease } from '@/design/sweet/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useT } from '@/lib/i18n';

const FRAMES = {
  lahmacun: require('../../assets/loading/lahmacun.webp'),
  cay: require('../../assets/loading/cay.webp'),
  nazar: require('../../assets/loading/nazar.webp'),
  kahve: require('../../assets/loading/kahve.webp'),
} as const;

const NAMES = ['lahmacun', 'cay', 'nazar', 'kahve'] as const;
type FrameName = (typeof NAMES)[number];

function pickFrame(): FrameName {
  const index = Math.floor(Math.random() * NAMES.length);
  return NAMES[index] ?? 'lahmacun';
}

/** Dönen illüstrasyon. Görünmezken animasyonu durur; yenileme sırasında parmak bırakılınca dönmeye başlar. */
export function SeziLoader({ size = 72, label, active = true }: { size?: number; label?: string; active?: boolean }) {
  const { t: tr } = useT();
  const reduced = useReducedMotion();
  const [name] = useState(pickFrame);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(active ? 0 : 1);
  const scale = useSharedValue(active && !reduced ? 0.96 : 1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(rotation);
      cancelAnimation(opacity);
      opacity.set(1);
      scale.set(1);
      return;
    }
    opacity.set(withTiming(1, { duration: duration.fade, easing: ease.out }));
    scale.set(reduced ? 1 : withTiming(1, { duration: duration.release, easing: ease.out }));
    if (reduced) {
      rotation.set(0);
      opacity.set(withRepeat(withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
      return;
    }
    rotation.set(withRepeat(withTiming(360, { duration: 1600, easing: Easing.linear }), -1, false));
  }, [active, reduced, rotation, opacity, scale]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ rotate: `${rotation.get()}deg` }, { scale: scale.get() }],
  }));

  const text = label ?? tr('common.loading');

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={text} style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size }, animated]}>
        <Image source={FRAMES[name]} style={{ width: size, height: size }} contentFit="contain" accessible={false} />
      </Animated.View>
    </View>
  );
}
