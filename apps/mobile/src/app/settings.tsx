import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, GlassScope, GlassTarget } from '@/components/glass';
import { PhotoSourceTag } from '@/components/photo-source';
import { ProfileCard } from '@/components/profile-card';
import { Text } from '@/components/text';
import { Button, ListRow, Segmented, ToggleRow } from '@/components/ui';
import { VisionSettings } from '@/components/vision-settings';
import { BackIcon, PlayIcon } from '@/design/icons';
import { SoftPressable } from '@/design/sweet/components';
import { font, space, type } from '@/design/type';
import { useIsDark, useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { usePassport } from '@/lib/passport';
import { useProfile } from '@/lib/profile';
import { useSettings } from '@/lib/settings';
import { themeCover } from '@/lib/theme-cover';
import { NARRATION_WAIT_MS, say } from '@/lib/voice/speech';
import { photoUrl, useWorks } from '@/lib/works';

export default function SettingsScreen() {
  const t = useSweetTheme();
  const darkMode = useIsDark();
  const tone = darkMode && !t.outlined ? 'dark' : 'light';
  const ink = t.glass[tone];
  const insets = useSafeAreaInsets();
  const { t: tr, lang } = useT();
  const { settings, update } = useSettings();
  const { count, clear } = usePassport();
  const { profile, resetProfile } = useProfile();
  const { data: works } = useWorks();
  const cover = useMemo(() => themeCover(works ?? [], 'bursa', 'passport', darkMode) ?? works?.find((w) => w.photos.length > 0)?.photos[0], [works, darkMode]);
  const divider = t.outlined ? t.border : `${ink.text}1F`;

  const confirm = (title: string, action: () => void) =>
    Alert.alert(title, `${tr('settings.confirm')} ${tr('settings.confirmBody')}`, [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('settings.confirmYes'), style: 'destructive', onPress: action },
    ]);

  return (
    <GlassScope>
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <GlassTarget style={StyleSheet.absoluteFill}>
          {!t.outlined && cover ? (
            <>
              <Image source={{ uri: photoUrl(cover) }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors accessible={false} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.glass.dark.tint, opacity: darkMode ? 0.56 : 0.22 }]} />
            </>
          ) : null}
        </GlassTarget>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={s.topBar}>
            <Glass tone={tone} radius={24}>
              <SoftPressable
                accessibilityRole="button"
                accessibilityLabel={tr('common.back')}
                onPress={() => router.back()}
                style={s.backBtn}>
                <BackIcon color={ink.text} />
              </SoftPressable>
            </Glass>
            <Glass tone={tone} radius={24} style={s.titlePill}>
              <Text style={[s.screenTitle, { color: ink.text }]} accessibilityRole="header" numberOfLines={1}>
                {tr('settings.title')}
              </Text>
            </Glass>
          </View>

          <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 48 }]} showsVerticalScrollIndicator={false}>
            {profile ? (
              <Glass tone={tone} radius={28} style={{ overflow: 'hidden' }}>
                <ProfileCard profile={profile} onEdit={(field) => router.push({ pathname: '/onboarding', params: { step: field } })} />
                <ListRow title={tr('profile.edit')} onPress={() => router.push('/onboarding')} />
              </Glass>
            ) : (
              <Glass tone={tone} radius={28} style={{ overflow: 'hidden' }}>
                <ListRow first title={tr('profile.edit')} onPress={() => router.push('/onboarding')} />
              </Glass>
            )}

            <Glass tone={tone} radius={28} style={{ overflow: 'hidden' }}>
              <View style={s.cardHead}>
                <Text style={[s.cardTitle, { color: ink.text }]} accessibilityRole="header">
                  {tr('settings.appearance')}
                </Text>
              </View>
              {/* Yüksek kontrast açık temadır; açıkken tema seçimi gizlenir. */}
              {!settings.highContrast ? (
                <View style={[s.block, { borderTopWidth: t.outlined ? 1 : StyleSheet.hairlineWidth, borderTopColor: divider }]}>
                  <Text style={[type.itemTitle, { color: ink.text }]}>{tr('settings.theme')}</Text>
                  <Segmented
                    label={tr('settings.theme')}
                    value={settings.themeMode}
                    onChange={(v) => update({ themeMode: v })}
                    options={[
                      { value: 'system', label: tr('settings.theme.system') },
                      { value: 'light', label: tr('settings.theme.light') },
                      { value: 'dark', label: tr('settings.theme.dark') },
                    ]}
                  />
                </View>
              ) : null}
              <VisionSettings first={false} />
            </Glass>

            <Glass tone={tone} radius={28} style={{ overflow: 'hidden' }}>
              <View style={s.cardHead}>
                <Text style={[s.cardTitle, { color: ink.text }]} accessibilityRole="header">
                  {tr('settings.guidance')}
                </Text>
              </View>
              <View style={[s.block, { borderTopWidth: t.outlined ? 1 : StyleSheet.hairlineWidth, borderTopColor: divider }]}>
                <Text style={[type.itemTitle, { color: ink.text }]}>{tr('settings.speech')}</Text>
                <Segmented
                  label={tr('settings.speech')}
                  value={settings.speechRate}
                  onChange={(v) => update({ speechRate: v })}
                  options={[
                    { value: 0.75, label: tr('settings.speech.slow') },
                    { value: 0.95, label: tr('settings.speech.normal') },
                    { value: 1.2, label: tr('settings.speech.fast') },
                  ]}
                />
                <Button
                  compact
                  variant="line"
                  label={tr('settings.speechTest')}
                  icon={(c) => <PlayIcon color={c} size={18} />}
                  onPress={() => {
                    say(tr('settings.speechSample'), { lang, rate: settings.speechRate, interrupt: true, waitMs: NARRATION_WAIT_MS });
                  }}
                />
              </View>
              <View style={[s.block, { borderTopWidth: t.outlined ? 1 : StyleSheet.hairlineWidth, borderTopColor: divider }]}>
                <Text style={[type.itemTitle, { color: ink.text }]}>{tr('settings.storyPlayback')}</Text>
                <Segmented
                  label={tr('settings.storyPlayback')}
                  value={settings.storyPlayback}
                  onChange={(v) => update({ storyPlayback: v })}
                  options={[
                    { value: 'auto', label: tr('settings.storyAuto') },
                    { value: 'tap', label: tr('settings.storyTap') },
                  ]}
                />
              </View>
            </Glass>

            <Glass tone={tone} radius={28} style={{ overflow: 'hidden' }}>
              <View style={s.cardHead}>
                <Text style={[s.cardTitle, { color: ink.text }]} accessibilityRole="header">
                  {tr('dev.title')}
                </Text>
              </View>
              <ToggleRow
                title={tr('dev.simulation')}
                subtitle={tr('dev.simulationSub')}
                value={settings.devSimulation}
                onChange={(v) => update({ devSimulation: v })}
              />
              {settings.devSimulation ? <ListRow title={tr('settings.device')} subtitle={tr('settings.deviceSub')} onPress={() => router.push('/lab')} /> : null}
            </Glass>

            <Glass tone={tone} radius={28} style={{ overflow: 'hidden' }}>
              <View style={s.cardHead}>
                <Text style={[s.cardTitle, { color: ink.text }]} accessibilityRole="header">
                  {tr('settings.data')}
                </Text>
              </View>
              <ListRow
                title={tr('settings.clearPassport')}
                subtitle={tr('settings.visitedCount', { n: count })}
                onPress={() =>
                  confirm(tr('settings.clearPassport'), () => {
                    void clear().catch(() => Alert.alert(tr('account.err.generic')));
                  })
                }
              />
              <ListRow title={tr('settings.resetProfile')} subtitle={tr('settings.resetProfileSub')} onPress={() => confirm(tr('settings.resetProfile'), resetProfile)} danger />
            </Glass>
          </ScrollView>
        </SafeAreaView>
        {!t.outlined ? <PhotoSourceTag photo={cover} position="top-right" style={{ top: insets.top + space.sm, right: space.lg }} /> : null}
      </View>
    </GlassScope>
  );
}

const s = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.sm, paddingRight: 64 },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  titlePill: { minHeight: 48, paddingHorizontal: space.lg, justifyContent: 'center' },
  screenTitle: { fontFamily: font.serif, fontSize: 22, lineHeight: 27, letterSpacing: -0.3 },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.lg },
  cardHead: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs },
  cardTitle: { fontFamily: font.serif, fontSize: 22, lineHeight: 27, letterSpacing: -0.3 },
  block: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
});
