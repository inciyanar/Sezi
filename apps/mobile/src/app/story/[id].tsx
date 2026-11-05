import { badgeFor, coverOf, loc, planTour, sweetThemes } from '@sezi/shared';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { BadgeArt, badgeName } from '@/components/social-visuals';
import { Text } from '@/components/text';
import { Button, Note } from '@/components/ui';
import { CloseIcon } from '@/design/icons';
import { SoftPressable } from '@/design/sweet/components';
import { space, type, upper } from '@/design/type';
import { useAchievements } from '@/lib/achievements';
import { useT } from '@/lib/i18n';
import { defaultStart, planner, useNavVersion } from '@/lib/nav';
import { usePassport } from '@/lib/passport';
import { useProfile } from '@/lib/profile';
import { useTours } from '@/lib/tours';
import { photoUrl, useWorks } from '@/lib/works';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { list, ready } = useAchievements();
  const { t, lang } = useT();
  const { visits } = usePassport();
  const { data: works } = useWorks();
  const tours = useTours();
  const { profile } = useProfile();
  const navVersion = useNavVersion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const card = useRef<View>(null);
  const [error, setError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const item = list.find((a) => a.id === id && a.level > 0);
  const tour = item?.kind === 'tour' ? tours.find((x) => x.slug === item.subject?.slug) : undefined;
  // navVersion: başlangıç noktaları değişince tur planı yeniden hesaplanır.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (tour && profile ? planTour(planner, tour, profile, defaultStart()) : null), [tour, profile, navVersion]);
  const recent = [...visits].sort((a, b) => b.first_at.localeCompare(a.first_at))[0];
  const coverSlug = tour ? (plan?.stops[0]?.slug ?? tour.stops[0]) : recent?.work_slug;
  const work = works?.find((w) => w.slug === coverSlug);
  const cover = work ? coverOf(work) : null;
  const cardWidth = Math.min(width - 48, Math.max(180, ((height - insets.top - insets.bottom - 180) * 9) / 16));
  const dark = sweetThemes.dark;
  const share = async () => {
    if (!card.current || sharing) return;
    setError(false);
    setSharing(true);
    try {
      const uri = await captureRef(card, { format: 'png', result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('stamp.share') });
    } catch {
      setError(true);
    } finally {
      setSharing(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: dark.background }}>
      <SoftPressable
        accessibilityRole="button"
        accessibilityLabel={t('stamp.close')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/passport'))}
        style={[styles.close, { top: insets.top + 4 }]}>
        <CloseIcon color={dark.onPhoto.text} size={24} />
      </SoftPressable>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + space.xl,
          gap: space.lg,
        }}>
        {item ? (
          <>
            <View
              ref={card}
              collapsable={false}
              style={{ width: cardWidth, height: (cardWidth * 16) / 9, overflow: 'hidden', backgroundColor: dark.soft }}>
              {cover && <Image source={{ uri: photoUrl(cover, 'full') }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />}
              <View
                style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '52%', backgroundColor: dark.glass.light.tint, opacity: 0.92 }}
              />
              <View style={{ position: 'absolute', top: '9%', left: '6%', width: '43%', gap: space.md }}>
                <Text style={[type.eyebrow, { color: dark.glass.light.muted }]}>{upper(t('stamp.storyTitle'), lang)}</Text>
                <Text accessibilityRole="header" style={[type.title, { color: dark.glass.light.text }]}>
                  {badgeName(badgeFor(item), t)}
                </Text>
                {plan && (
                  <Text style={[type.meta, { color: dark.glass.light.text }]}>
                    {plan.stops
                      .slice(0, 3)
                      .map((stop) => loc(stop.name, lang))
                      .join(' → ')}
                  </Text>
                )}
              </View>
              <View style={{ position: 'absolute', top: '35%', left: '30%', transform: [{ rotate: '-8deg' }] }}>
                <BadgeArt id={badgeFor(item)} size={cardWidth * 0.55} />
              </View>
              <View style={{ position: 'absolute', bottom: '12%', left: '6%', width: '43%', gap: space.sm }}>
                {plan && plan.stops.length > 0 && (
                  <Text style={[type.eyebrow, { color: dark.glass.light.text }]}>
                    {upper(t('stamp.storyStats', { n: plan.stops.length, m: Math.round(plan.lengthM) }), lang)}
                  </Text>
                )}
                <Text style={[type.itemTitle, { color: dark.glass.light.text }]}>{t('stamp.tag')}</Text>
                <Text style={[type.bubble, { color: dark.glass.light.text }]}>{t('stamp.invite')}</Text>
                <Text style={[type.meta, { color: dark.glass.light.muted }]}>{t('stamp.signature')}</Text>
              </View>
            </View>
            {error && <Note text={t('stamp.shareError')} />}
            <View style={{ width: cardWidth }}>
              <Button label={t('stamp.share')} variant="cream" onPress={() => void share()} disabled={sharing} />
            </View>
          </>
        ) : ready ? (
          <Text style={[type.body, { color: dark.onPhoto.text }]}>{t('stamp.unavailable')}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  close: { position: 'absolute', right: 20, zIndex: 2, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
