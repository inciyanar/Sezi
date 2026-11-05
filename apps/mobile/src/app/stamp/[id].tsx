import { BADGE_IDS, badgeFor, loc, planTour, sweetThemes } from '@sezi/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import { Glass } from '@/components/glass';
import { BadgeArt, badgeName, achievementTarget } from '@/components/social-visuals';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { CloseIcon } from '@/design/icons';
import { SoftPressable } from '@/design/sweet/components';
import { space, type, upper } from '@/design/type';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useAchievements } from '@/lib/achievements';
import { useT } from '@/lib/i18n';
import { defaultStart, planner, useNavVersion } from '@/lib/nav';
import { useProfile } from '@/lib/profile';
import { useTours } from '@/lib/tours';

export default function StampScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { list, ready } = useAchievements();
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { profile } = useProfile();
  const tours = useTours();
  const navVersion = useNavVersion();
  const item = list.find((a) => a.id === id && a.level > 0);
  const tour = item?.kind === 'tour' ? tours.find((x) => x.slug === item.subject?.slug) : undefined;
  // navVersion: başlangıç noktaları değişince tur planı yeniden hesaplanır.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (tour && profile ? planTour(planner, tour, profile, defaultStart()) : null), [tour, profile, navVersion]);
  const spin = useSharedValue(0);
  const float = useSharedValue(0);
  const confetti = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      spin.set(0);
      float.set(0);
      confetti.set(0);
      return;
    }
    spin.set(withRepeat(withTiming(360, { duration: 40000, easing: Easing.linear }), -1));
    float.set(withRepeat(withSequence(withTiming(-10, { duration: 1600 }), withTiming(0, { duration: 1600 })), -1));
    confetti.set(withTiming(1, { duration: 3200, easing: Easing.out(Easing.quad) }));
    return () => {
      cancelAnimation(spin);
      cancelAnimation(float);
      cancelAnimation(confetti);
    };
  }, [reduced, spin, float, confetti]);
  const raysStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const piecesStyle = useAnimatedStyle(() => ({ opacity: 1 - confetti.value, transform: [{ translateY: confetti.value * 160 }] }));
  const dark = sweetThemes.dark;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/passport'));
  const count = new Set(list.filter((a) => a.level > 0).map(badgeFor)).size;
  return (
    <View style={[styles.screen, { backgroundColor: dark.background }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" accessible={false}>
        <Defs>
          <RadialGradient id="glow">
            <Stop offset="0" stopColor={dark.gold.fill} stopOpacity={0.35} />
            <Stop offset="1" stopColor={dark.background} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50%" cy="34%" r="55%" fill="url(#glow)" />
      </Svg>
      {!reduced && (
        <Animated.View pointerEvents="none" style={[styles.rays, raysStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 400 400">
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i * Math.PI) / 8;
              return (
                <Line
                  key={i}
                  x1="200"
                  y1="200"
                  x2={200 + Math.cos(a) * 200}
                  y2={200 + Math.sin(a) * 200}
                  stroke={dark.gold.fill}
                  strokeOpacity={0.15}
                  strokeWidth="2"
                />
              );
            })}
          </Svg>
        </Animated.View>
      )}
      {!reduced && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, piecesStyle]}>
          {Array.from({ length: 34 }, (_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 55}%`,
                width: 6,
                height: 10,
                backgroundColor: i % 2 ? dark.gold.fill : dark.onPhoto.text,
                transform: [{ rotate: `${i * 31}deg` }],
              }}
            />
          ))}
        </Animated.View>
      )}
      <SoftPressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t('stamp.close')}
        style={[styles.close, { top: insets.top + 8, backgroundColor: dark.glass.dark.tint }]}>
        <CloseIcon color={dark.onPhoto.text} size={24} />
      </SoftPressable>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + space.xl,
          justifyContent: 'center',
          paddingHorizontal: space.xl,
          gap: space.xl,
        }}>
        {item ? (
          <>
            <Animated.View style={[{ alignItems: 'center' }, badgeStyle]}>
              <BadgeArt id={badgeFor(item)} size={220} />
            </Animated.View>
            <Glass tone="dark" radius={28} style={{ padding: space.xl, gap: space.md }}>
              <Text style={[type.eyebrow, { color: dark.onPhoto.muted }]}>
                {upper(t('stamp.new', { n: Math.min(count, BADGE_IDS.length), total: BADGE_IDS.length }), lang)}
              </Text>
              <Text accessibilityRole="header" style={[type.screenTitle, { color: dark.onPhoto.text }]}>
                {badgeName(badgeFor(item), t)}
              </Text>
              <Text style={[type.body, { color: dark.glass.dark.muted }]}>
                {t(`ach.${item.kind}.body`, { n: achievementTarget(item), name: item.subject ? loc(item.subject.name, lang) : '' })}
              </Text>
              {plan && plan.stops.length > 0 && (
                <Text style={[type.meta, { color: dark.onPhoto.text }]}>
                  {t('stamp.context', { n: plan.stops.length, m: Math.round(plan.lengthM) })}
                </Text>
              )}
              <Button
                variant="cream"
                label={t('stamp.shareStory')}
                onPress={() => router.push({ pathname: '/story/[id]', params: { id: item.id } })}
              />
              {/* Pasaport bir sekme: yığındaki ekranlar kapatılıp sekmeye geçilir (dismissTo yığında olmayan sekmeyi bulamaz). */}
              <Button
                variant="line"
                label={t('stamp.passport')}
                onPress={() => {
                  if (router.canDismiss()) router.dismissAll();
                  router.navigate('/passport');
                }}
              />
            </Glass>
          </>
        ) : ready ? (
          <Text style={[type.body, { color: dark.onPhoto.text }]}>{t('stamp.unavailable')}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  close: { position: 'absolute', right: 20, zIndex: 2, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rays: { position: 'absolute', top: '9%', alignSelf: 'center', width: 400, height: 400 },
});
