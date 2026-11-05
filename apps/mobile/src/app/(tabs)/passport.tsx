import { BADGE_IDS, badgeFor, INTEREST_BADGES, loc } from '@sezi/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useTabBarSpace } from '@/components/app-tabs';
import { Avatar } from '@/components/avatar';
import { Glass, GlassScope, GlassTarget } from '@/components/glass';
import { ProfileCard } from '@/components/profile-card';
import { PhotoSourceTag } from '@/components/photo-source';
import { RichTitle } from '@/components/rich-title';
import { StampGrid } from '@/components/social-grids';
import { achievementLabel, achievementTarget, BadgeArt, badgeName, stampTilt } from '@/components/social-visuals';
import { Text } from '@/components/text';
import { Badge, Button, ListRow, ProgressBar, SectionTitle } from '@/components/ui';
import { ArrowIcon, SettingsIcon } from '@/design/icons';
import { SoftPressable } from '@/design/sweet/components';
import { space, type } from '@/design/type';
import { useIsDark, useSweetTheme } from '@/hooks/use-sweet-theme';
import { useAccount } from '@/lib/account';
import { useAchievements } from '@/lib/achievements';
import { useIncomingCount } from '@/lib/friends';
import { useT } from '@/lib/i18n';
import { useIdentity } from '@/lib/identity';
import { usePassport } from '@/lib/passport';
import { useMyPhotos } from '@/lib/photos';
import { useProfile } from '@/lib/profile';
import { useReports } from '@/lib/reports';
import { useSettings } from '@/lib/settings';
import { themeCover } from '@/lib/theme-cover';
import { photoUrl, useCities, useWorks } from '@/lib/works';

export default function PassportScreen() {
  const t = useSweetTheme();
  const darkMode = useIsDark();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const { t: tr, lang } = useT();
  const { user } = useAccount();
  const { identity, avatar } = useIdentity();
  const { profile } = useProfile();
  const { visits } = usePassport();
  const { list, stats } = useAchievements();
  const photos = useMyPhotos();
  const incoming = useIncomingCount();
  const reports = useReports();
  const { data: works = [] } = useWorks();
  const { data: cities = [] } = useCities();
  const tabSpace = useTabBarSpace();
  const bySlug = new Map(works.map((work) => [work.slug, work]));
  const latest = [...visits].sort((a, b) => b.first_at.localeCompare(a.first_at))[0];
  const recentCover = latest ? bySlug.get(latest.work_slug)?.photos[0] : undefined;
  // Açık temada kişisel kapak korunur; koyu temada gölgeli çekime geçilir. İlk ziyaretten önce taslak kapağı.
  const cover = darkMode
    ? themeCover(works, settings.city, 'passport', true) ?? recentCover
    : recentCover ?? themeCover(works, settings.city, 'passport', false);
  const badges = BADGE_IDS.map((id) => {
    const candidates = list.filter((item) => badgeFor(item) === id);
    const earned = candidates.filter((item) => item.level > 0).sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''))[0];
    const best = candidates
      .filter((item) => item.level === 0)
      .sort((a, b) => b.current / Math.max(achievementTarget(b), 1) - a.current / Math.max(achievementTarget(a), 1))[0];
    return { id, achievement: earned ?? best };
  });
  const earnedCount = badges.filter(({ achievement }) => achievement && achievement.level > 0).length;
  // Sıradaki hedef: kurulumda seçilen ilgilerin damgaları önce, sonra en çok ilerlenen.
  const wanted = new Set((profile?.interests ?? []).map((k) => INTEREST_BADGES[k]));
  const progress = (a: Parameters<typeof achievementTarget>[0]) => a.current / Math.max(achievementTarget(a), 1);
  const next = badges
    .flatMap(({ id, achievement }) => (achievement && achievement.level === 0 ? [{ id, achievement }] : []))
    .sort((a, b) => Number(wanted.has(b.id)) - Number(wanted.has(a.id)) || progress(b.achievement) - progress(a.achievement))[0]?.achievement;
  const visitedCities = stats.cities.filter((city) => city.visited > 0);
  const joined = user?.created_at ? new Date(user.created_at) : null;
  const joinedText = joined && !Number.isNaN(joined.getTime()) ? joined.toLocaleDateString(lang, { month: 'long', year: 'numeric' }) : null;
  const approvedPhotos = photos.data?.filter((photo) => photo.review === 'approved').length;
  const tone = darkMode && !t.outlined ? 'dark' : 'light';
  const ink = t.glass[tone];

  return (
    <GlassScope>
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <GlassTarget style={StyleSheet.absoluteFill}>
          {!t.outlined && cover ? (
            <Image source={{ uri: photoUrl(cover) }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors accessible={false} />
          ) : null}
          {darkMode && !t.outlined ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.glass.dark.tint, opacity: 0.4 }]} />
          ) : null}
        </GlassTarget>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: tabSpace, gap: space.lg }}>
            <Glass tone={tone} radius={28} style={{ padding: space.lg, gap: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                <Text style={[type.eyebrow, { color: ink.muted, flex: 1 }]}>{tr('passport.cover').toLocaleUpperCase(lang)}</Text>
                <SoftPressable
                  accessibilityRole="button"
                  accessibilityLabel={tr('profile.settings')}
                  onPress={() => router.push('/settings')}
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 24,
                    backgroundColor: t.soft,
                  }}>
                  <SettingsIcon color={ink.text} size={22} />
                </SoftPressable>
              </View>
              {user ? (
                <SoftPressable
                  accessibilityRole="button"
                  accessibilityLabel={tr('profile.accountOpen')}
                  onPress={() => router.push('/account')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 72 }}>
                  <Avatar identity={identity} source={avatar} size={64} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[type.title, { color: ink.text }]}>{identity?.display_name ?? user.email}</Text>
                    {identity?.username ? <Text style={[type.meta, { color: ink.muted }]}>@{identity.username}</Text> : null}
                    {joinedText ? <Text style={[type.meta, { color: ink.muted }]}>{tr('passport.since', { date: joinedText })}</Text> : null}
                  </View>
                </SoftPressable>
              ) : (
                <>
                  <RichTitle text={tr('passport.signInTitle')} style={type.title} />
                  <Button label={tr('account.signIn')} onPress={() => router.push('/account/sign-in')} />
                  <Button variant="line" label={tr('account.signUp')} onPress={() => router.push('/account/sign-up')} />
                </>
              )}
              <View style={{ flexDirection: 'row', gap: space.md }}>
                {[
                  [`${earnedCount}/${BADGE_IDS.length}`, tr('passport.stampsLabel')],
                  [String(stats.stamps), tr('passport.worksLabel')],
                  ...(user && approvedPhotos !== undefined ? [[String(approvedPhotos), tr('passport.photosLabel')]] : []),
                ].map(([value, label]) => (
                  <View key={label} style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${value} ${label}`}>
                    <Text style={[type.title, { color: ink.text }]}>{value}</Text>
                    <Text style={[type.meta, { color: ink.muted }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </Glass>
            <Glass tone={tone} radius={28} style={{ padding: space.lg, gap: space.md }}>
              <Text accessibilityRole="header" style={[type.title, { color: ink.text }]}>
                {tr('ach.title')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {badges.map(({ id, achievement }) => {
                  const earned = !!achievement && achievement.level > 0;
                  const date = achievement?.earnedAt ? new Date(achievement.earnedAt) : null;
                  const dateText = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(lang, { day: '2-digit', month: '2-digit' }) : null;
                  return (
                    <SoftPressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityLabel={achievement ? achievementLabel(achievement, tr, lang) : `${badgeName(id, tr)}. ${tr('ach.locked')}`}
                      onPress={() => router.push('/achievements')}
                      style={{ width: '25%', alignItems: 'center', paddingVertical: space.sm, minHeight: 110, gap: 4 }}>
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          borderWidth: earned ? 0 : 1,
                          borderStyle: 'dashed',
                          borderColor: ink.muted,
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: [{ rotate: `${earned ? stampTilt(id) * 2 : 0}deg` }],
                        }}>
                        <BadgeArt id={id} size={60} locked={!earned} />
                      </View>
                      <Text style={[type.tab, { color: ink.text, textAlign: 'center' }]}>{badgeName(id, tr)}</Text>
                      {earned && dateText ? <Text style={[type.tab, { color: ink.muted }]}>{dateText}</Text> : null}
                    </SoftPressable>
                  );
                })}
              </View>
            </Glass>
            {next ? (
              <Glass tone={tone} radius={28} style={{ padding: space.lg, gap: space.md }}>
                <Text style={[type.eyebrow, { color: ink.muted }]}>{tr('passport.nextGoal').toLocaleUpperCase(lang)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width={64} height={64} style={StyleSheet.absoluteFill}>
                      <Circle cx={32} cy={32} r={28} stroke={ink.muted} strokeWidth={4} fill="none" />
                      <Circle
                        cx={32}
                        cy={32}
                        r={28}
                        stroke={t.gold.fill}
                        strokeWidth={4}
                        fill="none"
                        strokeDasharray={`${Math.min(next.current / Math.max(achievementTarget(next), 1), 1) * 176} 176`}
                        rotation={-90}
                        origin="32, 32"
                      />
                    </Svg>
                    <BadgeArt id={badgeFor(next)} size={48} locked />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.itemTitle, { color: ink.text }]}>{badgeName(badgeFor(next), tr)}</Text>
                    <Text style={[type.meta, { color: ink.muted }]}>
                      {next.current}/{achievementTarget(next)}
                    </Text>
                  </View>
                  <SoftPressable
                    accessibilityRole="button"
                    accessibilityLabel={tr('passport.findWork')}
                    onPress={() => router.navigate('/')}
                    style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.gold.fill, alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowIcon color={t.gold.ink} size={20} />
                  </SoftPressable>
                </View>
              </Glass>
            ) : null}
            <Glass tone={tone} radius={28} style={{ padding: space.lg, gap: space.lg }}>
              <SectionTitle title={tr('passport.seenWorks')} />
              {visits.length ? (
                <StampGrid visits={visits} works={bySlug} />
              ) : (
                <Button variant="line" label={tr('passport.findWork')} onPress={() => router.navigate('/')} />
              )}
              {visitedCities.length ? (
                <>
                  <SectionTitle title={tr('passport.cityProgress')} />
                  {visitedCities.map((city) => {
                    const row = cities.find((item) => item.slug === city.slug);
                    const name = row ? loc(row.name, lang) : city.slug;
                    return (
                      <View key={city.slug} style={{ gap: space.sm }}>
                        <Text style={[type.itemTitle, { color: ink.text }]}>
                          {name} · {city.visited}/{city.total}
                        </Text>
                        <ProgressBar compact value={city.visited} max={city.total} label={name} />
                      </View>
                    );
                  })}
                </>
              ) : null}
            </Glass>
            {profile ? <ProfileCard profile={profile} onEdit={(field) => router.push({ pathname: '/onboarding', params: { step: field } })} /> : null}
            <Glass tone={tone} radius={28} style={{ overflow: 'hidden' }}>
              <ListRow first title={tr('ach.title')} onPress={() => router.push('/achievements')} />
              <ListRow title={tr('photos.title')} onPress={() => router.push('/photos')} />
              <ListRow
                title={tr('friends.title')}
                trailing={incoming ? <Badge label={String(incoming)} /> : undefined}
                onPress={() => router.push('/friends')}
              />
              <ListRow
                title={tr('profile.reports')}
                trailing={reports.length ? <Badge label={String(reports.length)} /> : undefined}
                onPress={() => router.push('/reports')}
              />
              <ListRow title={tr('account.title')} onPress={() => router.push('/account')} />
              <ListRow title={tr('profile.settings')} onPress={() => router.push('/settings')} />
              <ListRow title={tr('exh.title')} onPress={() => router.push('/exhibitions')} />
              <ListRow title={tr('profile.about')} onPress={() => router.push('/about')} />
              <ListRow title={tr('privacy.title')} onPress={() => router.push('/privacy')} />
            </Glass>
          </ScrollView>
        </SafeAreaView>
        {!t.outlined ? <PhotoSourceTag photo={cover} position="top-right" style={{ top: insets.top + space.xs, right: space.lg }} /> : null}
      </View>
    </GlassScope>
  );
}
