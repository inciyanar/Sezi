import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import Animated, { useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { ChevronIcon } from '@/design/icons';
import { SoftPressable } from '@/design/sweet/components';
import { duration, ease } from '@/design/sweet/motion';
import { space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';

/** Kaydırma React durumuna geçmez; kapak yüksekliği onLayout ile güncellenir. */
export function useFloatingHeaderScroll() {
  const scrollY = useSharedValue(0);
  const coverHeight = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => { scrollY.set(event.contentOffset.y); });
  return { scrollY, coverHeight, onScroll };
}

export interface FloatingHeaderProps {
  title: string;
  scrollY: SharedValue<number>;
  coverHeight: SharedValue<number>;
  onBack?: () => void;
  /** Kapak koyu fotoğrafsa durum çubuğu kapak geçilene kadar açık renkli kalır. */
  lightOnCover?: boolean;
}

export function FloatingHeader({ title, scrollY, coverHeight, onBack = () => router.back(), lightOnCover = false }: FloatingHeaderProps) {
  const t = useSweetTheme();
  const { t: tr } = useT();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const [pastCover, setPastCover] = useState(false);
  // Durum çubuğu simgeleri çubuk yarı görünür olduğunda döner: fotoğraf üstünde koyu, çubuk üstünde açık simge kalmaz.
  const [barShown, setBarShown] = useState(false);
  // Kapak geçilince çubuk ve yüzen geri düğmesi 150 ms'de yer değiştirir (göz kırpması gibi anlık değil).
  // Yalnız opacity değiştiği için hareket azaltmada da aynen kalır.
  useAnimatedReaction(
    () => coverHeight.get() > 0 && scrollY.get() >= coverHeight.get(),
    (visible, previous) => {
      if (visible === previous) return;
      opacity.set(withTiming(visible ? 1 : 0, { duration: duration.fade, easing: ease.out }));
      scheduleOnRN(setPastCover, visible);
    },
  );
  useAnimatedReaction(
    () => opacity.get() > 0.5,
    (shown, previous) => {
      if (shown !== previous) scheduleOnRN(setBarShown, shown);
    },
  );
  const barStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const floatingStyle = useAnimatedStyle(() => ({ opacity: 1 - opacity.get() }));
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {lightOnCover ? <StatusBar style={barShown ? 'auto' : 'light'} /> : null}
      {/* İkisi de hep kurulu kalır ki geçiş sürebilsin; görünmeyen dokunulmaz ve ekran okuyucudan gizlenir. */}
      <Animated.View
        pointerEvents={pastCover ? 'auto' : 'none'}
        accessibilityElementsHidden={!pastCover}
        importantForAccessibility={pastCover ? 'auto' : 'no-hide-descendants'}
        style={[s.bar, { minHeight: insets.top + 64, paddingTop: insets.top + space.sm, backgroundColor: t.surface, borderBottomColor: t.border, borderBottomWidth: t.outlined ? 2 : StyleSheet.hairlineWidth }, barStyle]}
      >
        <Text style={[type.itemTitle, { color: t.text }]} numberOfLines={1}>{title}</Text>
        <SoftPressable onPress={onBack} accessibilityRole="button" accessibilityLabel={tr('work.back')} style={[s.barBack, { top: insets.top + space.sm, backgroundColor: t.surface }]}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><ChevronIcon color={t.text} size={22} /></View>
        </SoftPressable>
      </Animated.View>
      <Animated.View
        pointerEvents={pastCover ? 'none' : 'box-none'}
        accessibilityElementsHidden={pastCover}
        importantForAccessibility={pastCover ? 'no-hide-descendants' : 'auto'}
        style={[StyleSheet.absoluteFill, floatingStyle]}
      >
        <View style={[s.back, { top: insets.top + space.sm }]}>
          <Glass tone="dark" radius={24}>
            <SoftPressable onPress={onBack} accessibilityRole="button" accessibilityLabel={tr('work.back')} style={s.backButton}>
              <View style={{ transform: [{ rotate: '180deg' }] }}><ChevronIcon color={t.glass.dark.text} size={22} /></View>
            </SoftPressable>
          </Glass>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, top: 0, minHeight: 64, paddingLeft: 80, paddingRight: space.xl, paddingBottom: space.lg, justifyContent: 'center' },
  back: { position: 'absolute', left: space.lg, width: 48, height: 48 },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  barBack: { position: 'absolute', left: space.lg, top: space.sm, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
