import { loc, type UserPhoto, type WorkRow } from '@sezi/shared';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarSpace } from '@/components/app-tabs';
import { Glass, GlassScope, GlassTarget } from '@/components/glass';
import { PhotoSourceTag } from '@/components/photo-source';
import { SeziLoader } from '@/components/sezi-loader';
import { Text } from '@/components/text';
import { Button, Eyebrow } from '@/components/ui';
import { PeopleIcon, RouteIcon, ShareIcon, SoundIcon } from '@/design/icons';
import { outline, SoftPressable } from '@/design/sweet/components';
import { font, radius, space, type } from '@/design/type';
import { useIsDark, useSweetTheme } from '@/hooks/use-sweet-theme';
import { useAccount } from '@/lib/account';
import { useT, type Lang } from '@/lib/i18n';
import { pilotWorks } from '@/lib/nav';
import { useFeedAuthors, usePhotoUrls, usePublicFeed, type FeedAuthor, type FeedScope } from '@/lib/photos';
import { themeCover } from '@/lib/theme-cover';
import { say } from '@/lib/voice/speech';
import { photoUrl, useWorks } from '@/lib/works';

const SCOPES: FeedScope[] = ['all', 'friends'];

/**
 * "3 gün önce" / "2 hr ago": Hermes Android'de `Intl.RelativeTimeFormat` bulunmadığından
 * doğrudan hesaplanır; geçersiz tarihte boş döner.
 */
function relativeTime(iso: string, now: number, lang: Lang): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const minutes = Math.floor(Math.max(0, now - ts) / 60000);
  if (minutes < 1) return lang === 'tr' ? 'Az önce' : 'Just now';
  if (minutes < 60) return lang === 'tr' ? `${minutes} dk önce` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === 'tr' ? `${hours} sa önce` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return lang === 'tr' ? 'Dün' : 'Yesterday';
  return lang === 'tr' ? `${days} gün önce` : `${days}d ago`;
}

function workLink(lang: Lang, slug: string): string {
  return `https://sezi.info/${lang}/eser/${slug}`;
}

/**
 * Sezilenler: herkese açık, onaylı ziyaretçi fotoğrafları dikey, tam ekran akış olarak (salt okunur; beğeni ve
 * yorum yok). Her fotoğrafın betimi (`alt_text`) her zaman yazılır ve "Fotoğrafı dinle" ile okunur. Giriş
 * yapılmışsa "Arkadaşlar" kapsamı kabul edilmiş arkadaşların görünür fotoğraflarını gösterir.
 */
export default function Feed() {
  const t = useSweetTheme();
  const darkMode = useIsDark();
  const tone = darkMode && !t.outlined ? 'dark' : 'light';
  const ink = t.glass[tone];
  const { t: tr, lang } = useT();
  const { user } = useAccount();
  const [scope, setScope] = useState<FeedScope>('all');
  const feed = usePublicFeed(scope);
  const { data: works } = useWorks();
  const photos = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const paths = useMemo(() => photos.map((p) => p.path), [photos]);
  const userIds = useMemo(() => photos.map((p) => p.user_id), [photos]);
  const urls = usePhotoUrls(paths);
  const authors = useFeedAuthors(userIds);
  const bySlug = useMemo(() => new Map((works ?? []).map((w) => [w.slug, w])), [works]);
  const cover = useMemo(() => themeCover(works ?? [], 'bursa', 'passport', darkMode) ?? works?.find((w) => w.photos.length > 0)?.photos[0], [works, darkMode]);
  // Göreli tarih ekran açıldığı ana göre yazılır (her çizimde saat okunmaz).
  const [now] = useState(() => Date.now());
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const scopes = user ? SCOPES : SCOPES.slice(0, 1);

  return (
    <GlassScope>
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <GlassTarget style={StyleSheet.absoluteFill}>
          {photos.length === 0 && !t.outlined && cover ? (
            <>
              <Image source={{ uri: photoUrl(cover) }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors accessible={false} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.glass.dark.tint, opacity: darkMode ? 0.56 : 0.2 }]} />
            </>
          ) : null}
        </GlassTarget>
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FeedItem
              photo={item}
              uri={urls.data?.[item.path]}
              work={bySlug.get(item.work_slug)}
              author={authors.data?.get(item.user_id)}
              when={relativeTime(item.created_at, now, lang)}
              height={height}
              top={insets.top + 76}
              bottom={bottom}
            />
          )}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={[s.empty, { minHeight: height, paddingTop: insets.top + 84, paddingBottom: bottom }]}>
              {feed.isLoading ? (
                <Glass tone={tone} radius={28} style={s.emptyCard}>
                  <SeziLoader label={tr('account.loading')} />
                </Glass>
              ) : (
                <Glass tone={tone} radius={28} style={s.emptyCard}>
                  <View style={[s.emptyIcon, { backgroundColor: t.gold.fill }, outline(t)]}>
                    <PeopleIcon color={t.gold.ink} filled size={24} />
                  </View>
                  <Eyebrow text={tr('tabs.feed')} />
                  <Text style={[s.emptyTitle, { color: ink.text }]}>{tr(feed.isError ? 'feed.error' : 'feed.empty')}</Text>
                  <Button
                    arrow={!feed.isError}
                    label={tr(feed.isError ? 'explore.retry' : 'photos.shareAction')}
                    onPress={() => (feed.isError ? void feed.refetch() : router.push('/photos/new'))}
                    style={{ alignSelf: 'stretch' }}
                  />
                </Glass>
              )}
            </View>
          }
        />
        {scopes.length > 1 ? (
          <Glass tone={tone} radius={radius.pill} style={[s.scopes, { top: insets.top + space.md }]}>
            <View accessibilityRole="radiogroup" accessibilityLabel={tr('tabs.feed')} style={s.scopeRow}>
              {scopes.map((value) => {
                const on = scope === value;
                const label = tr(value === 'all' ? 'feed.all' : 'feed.friends');
                return (
                  <SoftPressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={label}
                    onPress={() => {
                      if (on) return;
                      void Haptics.selectionAsync();
                      setScope(value);
                    }}
                    style={[s.scope, on && { backgroundColor: t.primary.fill }]}>
                    <Text style={[type.bubble, { color: on ? t.primary.ink : ink.text }, !on && { fontFamily: type.meta.fontFamily }]}>{label}</Text>
                  </SoftPressable>
                );
              })}
            </View>
          </Glass>
        ) : null}
        {photos.length === 0 && !t.outlined ? (
          <PhotoSourceTag photo={cover} position="top-right" style={{ top: insets.top + space.md, right: space.lg }} />
        ) : null}
      </View>
    </GlassScope>
  );
}

function FeedItem({
  photo,
  uri,
  work,
  author,
  when,
  height,
  top,
  bottom,
}: {
  photo: UserPhoto;
  uri: string | undefined;
  work: WorkRow | undefined;
  author: FeedAuthor | undefined;
  when: string;
  height: number;
  top: number;
  bottom: number;
}) {
  const t = useSweetTheme();
  const { t: tr, lang } = useT();
  const name = author?.display_name || (author?.username ? `@${author.username}` : tr('feed.traveler'));
  const workName = work ? loc(work.name, lang) : photo.work_slug;
  const inPilot = pilotWorks.some((p) => p.workSlug === photo.work_slug);
  const openWork = () => router.push({ pathname: '/work/[slug]', params: { slug: photo.work_slug } });
  return (
    <GlassScope>
      <View style={{ height, backgroundColor: t.text }}>
        <GlassTarget style={StyleSheet.absoluteFill}>
          {uri ? <Image source={uri} contentFit="cover" accessibilityLabel={photo.alt_text} style={StyleSheet.absoluteFill} /> : null}
        </GlassTarget>
        <View style={[s.rail, { top }]}>
          <RailAction label={tr('feed.work')} onPress={openWork} />
          {inPilot ? (
            <RailAction
              label={tr('feed.route')}
              icon={(c) => <RouteIcon color={c} size={20} />}
              onPress={() => router.push({ pathname: '/navigate', params: { dest: photo.work_slug } })}
            />
          ) : null}
          <RailAction
            label={tr('feed.share')}
            icon={(c) => <ShareIcon color={c} size={20} />}
            onPress={() => void Share.share({ url: workLink(lang, photo.work_slug), message: workLink(lang, photo.work_slug) })}
          />
        </View>
        <Glass tone="dark" radius={radius.xl} style={[s.info, { bottom }]}>
          <Text style={[type.itemTitle, { color: t.glass.dark.text }]}>{name}</Text>
          {when ? <Text style={[type.meta, { color: t.glass.dark.muted }]}>{when}</Text> : null}
          <SoftPressable accessibilityRole="link" accessibilityLabel={workName} onPress={openWork} style={s.workLink}>
            <Text style={[type.cardTitle, { color: t.glass.dark.text }]}>{workName}</Text>
          </SoftPressable>
          {photo.caption ? <Text style={[type.body, { color: t.glass.dark.text }]}>{photo.caption}</Text> : null}
          <SoftPressable
            accessibilityRole="button"
            accessibilityLabel={tr('feed.listen')}
            onPress={() => {
              void Haptics.selectionAsync();
              say(photo.alt_text, { lang, rate: 1, interrupt: true });
            }}
            style={s.listen}>
            <View style={[s.listenDot, { backgroundColor: t.gold.fill }]}>
              <SoundIcon color={t.gold.ink} size={18} />
            </View>
            <Text style={[type.bubble, { color: t.glass.dark.text }]}>{tr('feed.listen')}</Text>
          </SoftPressable>
          <Text style={[type.meta, { color: t.glass.dark.muted }]}>{photo.alt_text}</Text>
        </Glass>
      </View>
    </GlassScope>
  );
}

function RailAction({ label, onPress, icon }: { label: string; onPress: () => void; icon?: (color: string) => React.ReactNode }) {
  const t = useSweetTheme();
  return (
    <SoftPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <Glass tone="dark" radius={radius.pill} style={s.action}>
        {icon ? icon(t.glass.dark.text) : null}
        <Text style={[type.bubble, { color: t.glass.dark.text }]}>{label}</Text>
      </Glass>
    </SoftPressable>
  );
}

const s = StyleSheet.create({
  scopes: { position: 'absolute', alignSelf: 'center', padding: 4 },
  scopeRow: { flexDirection: 'row', gap: 4 },
  scope: { minHeight: 48, paddingHorizontal: space.xl, borderRadius: radius.pill, justifyContent: 'center' },
  rail: { position: 'absolute', right: space.md, gap: space.sm, alignItems: 'flex-end' },
  action: { minHeight: 48, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  info: { position: 'absolute', left: 14, right: 14, padding: 18, gap: 4 },
  workLink: { minHeight: 48, justifyContent: 'center' },
  listen: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  listenDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingHorizontal: space.lg, justifyContent: 'center' },
  emptyCard: { padding: space.xl, gap: space.md, alignItems: 'center' },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: font.serif, fontSize: 26, lineHeight: 32, letterSpacing: -0.4, textAlign: 'center' },
});
