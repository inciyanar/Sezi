import { coverOf, distanceM, hasLocation, INTEREST_TYPES, isShowcaseWork, loc, sweetThemes, toneForType, type LngLat, type WorkRow } from '@sezi/shared';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { GestureDetector, FlatList as GestureFlatList } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useTabBarSpace } from '@/components/app-tabs';
import { CityMap } from '@/components/city-map';
import { Glass, GlassScope, GlassTarget, type GlassToneName } from '@/components/glass';
import { PhotoCard, PhotoScrim, WorkPreviewSheet } from '@/components/photo-card';
import { PhotoSourceTag } from '@/components/photo-source';
import { RichTitle } from '@/components/rich-title';
import { useSeziRefresh } from '@/components/sezi-refresh';
import { Text } from '@/components/text';
import { Button, Eyebrow } from '@/components/ui';
import { ArrowIcon, CheckIcon, CompassIcon, InfoIcon, PassportIcon, PinIcon, PlayIcon, SearchIcon, StopIcon } from '@/design/icons';
import { BookIcon, HeadsetIcon } from '@/design/sense-icons';
import { outline, Skeleton, SoftPressable, SweetSheet, TypeTile } from '@/design/sweet/components';
import { font, radius, space, type } from '@/design/type';
import { WorkGlyphInline } from '@/design/work-glyph';
import { useIsDark, useSweetTheme } from '@/hooks/use-sweet-theme';
import { useAccount } from '@/lib/account';
import { useT } from '@/lib/i18n';
import { initials, useIdentity } from '@/lib/identity';
import { formatDistance } from '@/lib/nav';
import { useProfile } from '@/lib/profile';
import { useSettings } from '@/lib/settings';
import { AUDIO_BASE } from '@/lib/supabase';
import { useTours } from '@/lib/tours';
import { themeCover } from '@/lib/theme-cover';
import { createClipPlayer } from '@/lib/voice/clip-player';
import { photoUrl, useCities, useWorks } from '@/lib/works';

type Filter = 'all' | 'audio' | 'text';
const FILTERS: Filter[] = ['all', 'audio', 'text'];
const clip = createClipPlayer();
/** Fotoğraflı üst kısmın yüksekliği ve buzlu sayfanın ona bindiği pay (maket: 470 / sayfa 326'da başlar). */
const HERO_H = 470;
const SHEET_OVERLAP = 144;
const AnimatedWorkList = Animated.createAnimatedComponent(GestureFlatList<WorkRow>);

function roman(n: number): string {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const letters = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  values.forEach((value, i) => {
    while (n >= value) {
      result += letters[i];
      n -= value;
    }
  });
  return result;
}

/**
 * Keşfet (maketteki ana sayfa): il fotoğrafı üstünde konum hapı, avatar, selam, "Yanı başında _n hikâye_" ve
 * eser arama çubuğu ve küçük kedi asistan düğmesi; fotoğrafın altına binen buzlu sayfada Tümü · Dinle · Oku, "Hemen _yanında_" kartları,
 * "Bugünün _rotası_", tür karoları ve tüm eserler. Sayılar, mesafeler ve etiketler gerçek veriden; uydurma yok.
 */
export default function Explore() {
  const t = useSweetTheme();
  const { t: tr, lang } = useT();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { settings, update } = useSettings();
  const { user } = useAccount();
  const { identity, avatar } = useIdentity();
  const { profile } = useProfile();
  const { data: cities, error: cityError, refetch: reloadCities } = useCities();
  const active = (cities ?? []).filter((c) => c.is_active);
  const citySlug = active.some((c) => c.slug === settings.city) ? settings.city : (active[0]?.slug ?? settings.city);
  const city = active.find((c) => c.slug === citySlug);
  const { data: works, error, refetch } = useWorks(citySlug);
  const { data: allWorks } = useWorks();
  const tours = useTours();
  const darkMode = useIsDark();
  const tone: GlassToneName = darkMode && !t.outlined ? 'dark' : 'light';
  const [kind, setKind] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sheet, setSheet] = useState(false);
  const [preview, setPreview] = useState<WorkRow | null>(null);
  const [here, setHere] = useState<LngLat | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [audioError, setAudioError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        try {
          const permission = await Location.getForegroundPermissionsAsync();
          if (!permission.granted) {
            if (alive) setHere(null);
            return;
          }
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (alive) setHere([position.coords.longitude, position.coords.latitude]);
        } catch {
          if (alive) setHere(null);
        }
      })();
      return () => {
        alive = false;
        clip.stop();
        setPlaying(null);
      };
    }, []),
  );
  useEffect(() => () => clip.stop(), []);

  // Kurulumda seçilen ilgilerin türleri (cami, türbe, han) önce gelir; gerisi eser sayısına göre.
  const interestTypes = useMemo(() => (profile?.interests ?? []).flatMap((k) => INTEREST_TYPES[k] ?? []), [profile?.interests]);
  // Vitrinde yalnız kapaklı ve Türkçe metni olan eserler görünür; diğerleri aramada bulunur.
  const showcaseWorks = useMemo(() => (works ?? []).filter(isShowcaseWork), [works]);
  const types = useMemo(() => {
    const counts = new Map<string, { name: string; n: number }>();
    for (const w of showcaseWorks) counts.set(w.type_slug, { name: loc(w.type_name, lang), n: (counts.get(w.type_slug)?.n ?? 0) + 1 });
    const rank = (slug: string) => {
      const i = interestTypes.indexOf(slug);
      return i < 0 ? interestTypes.length : i;
    };
    return [...counts].sort((a, b) => rank(a[0]) - rank(b[0]) || b[1].n - a[1].n);
  }, [showcaseWorks, lang, interestTypes]);
  const audioOf = (w: WorkRow) => (lang === 'en' ? w.audio_en : w.audio_tr);
  // Ses kaydı olan eser yoksa "Dinle" seçeneği çizilmez (boş sonuç veren seçenek gösterilmez).
  const filters = useMemo(
    () => FILTERS.filter((value) => value !== 'audio' || showcaseWorks.some((w) => !!(lang === 'en' ? w.audio_en : w.audio_tr))),
    [showcaseWorks, lang],
  );
  // Sıralama tek `Intl.Collator` ile: karşılaştırma başına `localeCompare(…, lang)` Hermes'te her seferinde yeni
  // karşılaştırıcı kurduğundan 340 eserde açılışı ~3 sn kilitliyordu (sürüm derlemesi ölçümü).
  const visible = useMemo(() => {
    const collator = new Intl.Collator(lang);
    return showcaseWorks
      .filter(
        (w) =>
          (!kind || w.type_slug === kind) && (filter === 'all' || (filter === 'text' ? !!(w.summary || w.history || w.architecture) : !!(lang === 'en' ? w.audio_en : w.audio_tr))),
      )
      .map((w) => ({ w, name: loc(w.name, lang) }))
      .sort((a, b) => collator.compare(a.name, b.name))
      .map((x) => x.w);
  }, [showcaseWorks, kind, filter, lang]);
  const distance = (w: WorkRow) => (here && hasLocation(w) ? distanceM(here, [w.lng, w.lat]) : null);
  const near = useMemo(
    () =>
      [...visible]
        .sort((a, b) => {
          if (!here) return 0;
          const da = hasLocation(a) ? distanceM(here, [a.lng, a.lat]) : Infinity;
          const db = hasLocation(b) ? distanceM(here, [b.lng, b.lat]) : Infinity;
          return da - db;
        })
        .slice(0, 8),
    [visible, here],
  );
  // Yanı başındaki hikâye sayısı yalnız 500 m içinde gerçekten eser varsa söylenir ("0 hikâye" yerine il sayısı).
  const nearbyCount = here && allWorks ? allWorks.filter((w) => hasLocation(w) && distanceM(here, [w.lng, w.lat]) <= 500).length : 0;
  const firstCover = (works ?? []).map(coverOf).find(Boolean);
  const heroCover = themeCover(works ?? [], citySlug, 'explore', darkMode) ?? firstCover;
  const now = new Date();
  const day = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000);
  const todayTour = tours.length ? tours[day % tours.length] : undefined;
  // Tur kapağı: fotoğrafı olan ilk durak; duraklarda fotoğraf yoksa ilin fotoğrafı (kart boş siyah kalmasın).
  const tourCover = todayTour
    ? (todayTour.stops
        .map((slug) => (allWorks ?? []).find((w) => w.slug === slug))
        .map((w) => (w ? coverOf(w) : undefined))
        .find(Boolean) ?? firstCover)
    : undefined;
  const hour = now.getHours();
  const greeting = tr(hour >= 5 && hour < 12 ? 'discover.morning' : hour >= 12 && hour < 18 ? 'discover.day' : 'discover.evening');
  const tileW = (width - 2 * space.xl - space.md) / 2;
  const open = (slug: string) => router.push({ pathname: '/work/[slug]', params: { slug } });
  const submitSearch = () => router.push({ pathname: '/search', params: { q: searchQuery.trim() } });
  const reload = useCallback(() => Promise.all([refetch(), reloadCities()]), [refetch, reloadCities]);
  const { pan, panRef, onScroll, listStyle, stretchStyle, backdropStyle, overlay } = useSeziRefresh(reload, { stretchHeight: HERO_H });
  // Saklı liste varken ağ hatası ekranı boşaltmaz; hata yalnız hiç veri yokken gösterilir.
  const failed = (!works && !!error) || (!cities && !!cityError);
  const loading = !works && !failed;
  // Fotoğraf üstündeki krem yazıya yumuşak koyu gölge (yüksek kontrastta zemin zaten opak).
  const heroInk = t.outlined ? null : { textShadowColor: `${t.glass.dark.tint}B3`, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 12 };
  const ink = t.glass[tone];
  const toggleAudio = (w: WorkRow) => {
    void Haptics.selectionAsync();
    setAudioError(false);
    if (playing === w.id) {
      clip.stop();
      setPlaying(null);
      return;
    }
    const path = audioOf(w);
    if (!path) return;
    setPlaying(w.id);
    clip.play(AUDIO_BASE + path, {
      onEnd: () => setPlaying(null),
      onError: () => {
        setPlaying(null);
        setAudioError(true);
      },
    });
  };

  // Aynı fotoğraf iki kez çizilir: listenin içinde ve çekerken açılan boşluğu dolduran arka kopyada.
  const heroPhoto = (
    <>
      {heroCover ? (
        <Image
          source={{ uri: photoUrl(heroCover) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={{ top: '60%' }}
          priority="high"
          transition={250}
          accessible={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.glass.dark.tint }]} />
      )}
      <HeroShade dark={darkMode} />
    </>
  );

  const header = (
    <GlassScope>
      {/* Bulanıklık hedefi tüm üst bölüm: fotoğraf ve altında sayfa zemini. Buzlu sayfa fotoğrafın bittiği yerde dikiş
          vermeden zemine geçer. */}
      <GlassTarget style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.background }]} />
        {/* Aşağı çekerken alt kenarı yerinde kalarak yukarı uzar. */}
        <Animated.View style={[s.heroBg, s.stretch, stretchStyle]}>{heroPhoto}</Animated.View>
      </GlassTarget>
      <View style={s.hero}>
        <View style={[s.heroContent, { paddingTop: insets.top + 8 }]}>
          <View style={s.topRow}>
            <Glass tone={tone} radius={radius.pill} style={{ flexShrink: 1 }}>
              <SoftPressable
                style={s.city}
                onPress={() => setSheet(true)}
                accessibilityRole="button"
                accessibilityLabel={tr('design.chooseCity')}
                accessibilityHint={city ? loc(city.name, lang) : undefined}>
                <PinIcon color={ink.text} size={16} />
                {/* İller ilk kez yüklenirken "Şehir seç" yazmaz (seçim yapılmış gibi görünüyordu); kısa iskelet çizilir. */}
                {city || cities ? (
                  <Text style={[type.bubble, { color: ink.text, flexShrink: 1 }]} numberOfLines={1}>
                    {city ? loc(city.name, lang) : tr('design.chooseCity')}
                  </Text>
                ) : (
                  <Skeleton width={56} height={14} corner={7} color={`${ink.text}33`} />
                )}
              </SoftPressable>
            </Glass>
            <View style={s.topActions}>
              <Glass tone={tone} radius={radius.pill}>
                <SoftPressable style={s.catButton} feedback="opacity" onPress={() => router.push('/ask')} accessibilityRole="button" accessibilityLabel={tr('ask.title')}>
                  <Image source={require('../../../assets/images/sezi-cat.webp')} style={s.catImage} contentFit="contain" accessible={false} />
                </SoftPressable>
              </Glass>
              <SoftPressable
                // Fotoğraf üstündeki avatar her temada kiremit (maketteki --clay); koyu temanın açık tonu krem yazıyı soldurur.
                style={[s.avatar, { backgroundColor: t.outlined ? t.surface : sweetThemes.light.tones.coral.ink, borderColor: t.outlined ? t.border : `${t.onPhoto.text}99` }]}
                onPress={() => router.navigate('/passport')}
                accessibilityRole="button"
                accessibilityLabel={tr('passport.open')}>
                {avatar ? (
                  <Image source={avatar} style={s.avatarImage} contentFit="cover" />
                ) : identity?.display_name && user ? (
                  <Text style={{ fontFamily: font.serif, fontSize: 19, color: t.outlined ? t.text : t.onPhoto.text }}>{initials(identity.display_name)}</Text>
                ) : (
                  <PassportIcon color={t.outlined ? t.text : t.onPhoto.text} />
                )}
              </SoftPressable>
            </View>
          </View>
          <View style={s.heroText}>
            <Eyebrow text={[greeting, user && identity?.display_name ? identity.display_name : null].filter(Boolean).join(' ')} color={t.onPhoto.text} style={heroInk} />
            {nearbyCount > 0 ? (
              <RichTitle text={tr('discover.nearCount', { n: nearbyCount })} onPhoto style={[s.display, { color: t.onPhoto.text }, heroInk]} />
            ) : city && works ? (
              <RichTitle text={tr('discover.cityCount', { city: loc(city.name, lang), n: works.length })} onPhoto style={[s.display, { color: t.onPhoto.text }, heroInk]} />
            ) : loading ? (
              <Skeleton width={230} height={44} corner={14} color={`${t.onPhoto.text}40`} />
            ) : null}
            <Glass tone={tone} radius={radius.pill} style={s.search}>
              <View style={s.searchField}>
                <SearchIcon color={ink.text} size={19} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={tr('explore.searchCta')}
                  placeholderTextColor={ink.muted}
                  accessibilityLabel={tr('explore.searchCta')}
                  returnKeyType="search"
                  submitBehavior="submit"
                  onSubmitEditing={submitSearch}
                  style={[type.body, s.searchInput, { color: ink.text }]}
                />
              </View>
              <SoftPressable
                style={[s.searchBtn, { backgroundColor: t.primary.fill }]}
                onPress={submitSearch}
                accessibilityRole="button"
                accessibilityLabel={tr('explore.searchCta')}>
                <SearchIcon color={t.primary.ink} size={18} />
              </SoftPressable>
            </Glass>
          </View>
        </View>
      </View>
      {/* Buzlu sayfa fotoğrafın alt kısmına biner; fotoğraf arkasında bulanık görünür (maketteki `.ksheet`). */}
      <View style={s.sheet}>
        <Glass tone={tone} style={[StyleSheet.absoluteFill, s.sheetGlass]} />
        <View style={[s.grab, { backgroundColor: `${ink.text}33` }]} />
        <View style={s.modes} accessibilityRole="radiogroup" accessibilityLabel={tr('discover.modes')}>
          {filters.map((value) => (
            <ModeButton
              key={value}
              tone={tone}
              on={filter === value}
              label={value === 'all' ? tr('explore.all') : value === 'audio' ? tr('discover.listen') : tr('discover.read')}
              icon={(c) => (value === 'all' ? <CompassIcon color={c} size={18} /> : value === 'audio' ? <HeadsetIcon color={c} size={18} /> : <BookIcon color={c} size={18} />)}
              onPress={() => setFilter(value)}
            />
          ))}
        </View>
        {loading ? (
          <View accessibilityLabel={tr('common.loading')} accessibilityRole="progressbar">
            <View style={s.sectionHead}>
              <Skeleton width={160} height={26} corner={10} color={`${ink.text}1F`} />
            </View>
            <View style={[s.carousel, { flexDirection: 'row', paddingTop: 12, overflow: 'hidden' }]}>
              <Skeleton width={236} height={166} corner={26} color={`${ink.text}1F`} />
              <Skeleton width={236} height={166} corner={26} color={`${ink.text}1F`} />
            </View>
          </View>
        ) : near.length ? (
          <View>
            <SectionHead title={tr('discover.near')} action={tr('discover.seeAll')} onAction={() => router.push('/search')} tone={tone} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel}>
              {near.map((w) => {
                const century =
                  w.built_year && w.built_year > 0 ? tr('discover.century', { n: roman(Math.ceil(w.built_year / 100)) }) : w.period ? loc(w.period, lang) : '';
                const d = distance(w);
                return (
                  <NearCard
                    key={w.id}
                    work={w}
                    meta={[loc(w.type_name, lang), century].filter(Boolean).join(' · ')}
                    distance={d !== null ? formatDistance(d, lang) : null}
                    hasAudio={!!audioOf(w)}
                    playing={playing === w.id}
                    onOpen={() => open(w.slug)}
                    onToggleAudio={() => toggleAudio(w)}
                  />
                );
              })}
            </ScrollView>
            {audioError ? (
              <Text accessibilityLiveRegion="polite" style={[type.meta, { color: t.danger, paddingHorizontal: 20, paddingTop: space.sm }]}>
                {tr('discover.audioError')}
              </Text>
            ) : null}
          </View>
        ) : null}
        {todayTour ? (
          <View>
            <SectionHead title={tr('discover.today')} action={tr('discover.allTours')} onAction={() => router.push('/tours')} tone={tone} />
            <View style={s.todayWrap}>
              <SoftPressable
                onPress={() => router.push({ pathname: '/tour/[id]', params: { id: todayTour.slug } })}
                accessibilityRole="button"
                accessibilityLabel={`${loc(todayTour.title, lang)}. ${tr('tours.stops', { n: todayTour.stops.length })}`}
                accessibilityHint={tr('discover.tourOpen')}
                style={[s.today, { backgroundColor: t.glass.dark.tint }]}>
                {tourCover ? (
                  <Image source={{ uri: photoUrl(tourCover, 'thumb') }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
                ) : null}
                {/* Süs çizgisi: rotanın kendisi değil, kartın "yol" olduğunu söyler. Fotoğrafın üst yarısında kalır. */}
                <Svg style={s.todayPath} viewBox="0 0 330 80" preserveAspectRatio="none" accessible={false}>
                  <Path d="M20 60 C 80 20, 130 76, 190 40 S 280 34, 310 18" fill="none" stroke={t.onPhoto.text} strokeWidth={2} strokeDasharray="1 7" strokeLinecap="round" />
                </Svg>
                {/* Yazı cam blok yerine yalnız alttan koyulaşan örtünün üstünde: fotoğraf görünür kalır. */}
                <PhotoScrim height="62%" />
                <View style={[s.todayInfo, t.outlined && { backgroundColor: t.glass.dark.tint }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.todayTitle, { color: t.onPhoto.text }]} numberOfLines={1}>
                      {loc(todayTour.title, lang)}
                    </Text>
                    <Text style={[type.meta, { color: t.onPhoto.muted }]}>{tr('tours.stops', { n: todayTour.stops.length })}</Text>
                  </View>
                  <View style={[s.arrow, { backgroundColor: t.gold.fill }]}>
                    <ArrowIcon color={t.gold.ink} size={16} />
                  </View>
                </View>
              </SoftPressable>
              <PhotoSourceTag photo={tourCover} position="top-right" />
            </View>
          </View>
        ) : null}
        {types.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.carousel, { paddingTop: space.xl }]}>
            <TypeTile label={tr('explore.all')} slug={null} selected={kind === null} tone={{ fill: t.soft, ink: t.text }} onPress={() => setKind(null)} />
            {types.map(([slug, { name }]) => (
              <TypeTile
                key={slug}
                label={name}
                slug={slug}
                selected={kind === slug}
                tone={t.tones[toneForType(slug)]}
                onPress={() => setKind(kind === slug ? null : slug)}
              />
            ))}
          </ScrollView>
        ) : null}
        {!loading && !failed && visible.length ? (
          <Text style={[type.heading, { color: ink.text, paddingHorizontal: space.xl, paddingTop: space.xl }]} accessibilityRole="header">
            {tr('home.allWorks')}
          </Text>
        ) : null}
      </View>
    </GlassScope>
  );

  const empty = loading ? (
    <View style={[s.gridRow, { flexDirection: 'row' }]}>
      <Skeleton width={tileW} height={220} />
      <Skeleton width={tileW} height={220} />
    </View>
  ) : failed ? (
    <View style={s.state}>
      <InfoIcon color={t.accent.ink} size={40} />
      <Text style={[type.heading, { color: t.text, textAlign: 'center' }]}>{tr('explore.error')}</Text>
      <Button label={tr('explore.retry')} onPress={reload} />
    </View>
  ) : visible.length === 0 ? (
    <View style={s.state}>
      <WorkGlyphInline slug={kind ?? 'cami'} color={t.text} size={44} />
      <Text style={[type.heading, { color: t.text, textAlign: 'center' }]}>{tr('explore.empty')}</Text>
    </View>
  ) : null;
  return (
    <View style={[s.screen, { backgroundColor: t.background }]}>
      <Animated.View pointerEvents="none" style={[s.heroBg, s.stretch, backdropStyle]}>{heroPhoto}</Animated.View>
      {/* Çekme jesti listeyi saran katmanda; liste gesture-handler `FlatList`'i olduğu için kaydırmayla birlikte çalışır. */}
      <GestureDetector gesture={pan}>
        <Animated.View collapsable={false} style={[s.screen, listStyle]}>
          <AnimatedWorkList
            simultaneousHandlers={panRef}
            importantForAccessibility={sheet ? 'no-hide-descendants' : 'auto'}
            data={loading || failed ? [] : visible}
            keyExtractor={(w) => w.id}
            numColumns={2}
            columnWrapperStyle={s.gridRow}
            ListHeaderComponent={header}
            ListHeaderComponentStyle={{ marginBottom: space.md }}
            ListEmptyComponent={empty}
            contentContainerStyle={{ paddingBottom: tabSpace }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            // Android'in esneme efekti tepedeki sürüklemeyi kendine alır; çekme yalnız `useSeziRefresh` lastiğiyle izlenir.
            overScrollMode="never"
            renderItem={({ item }) => <PhotoCard work={item} width={tileW} onPress={() => open(item.slug)} onLongPress={() => setPreview(item)} />}
          />
        </Animated.View>
      </GestureDetector>
      {overlay}
      <SweetSheet visible={sheet} onClose={() => setSheet(false)} title={tr('design.chooseCity')}>
        <ScrollView contentContainerStyle={s.sheetBody}>
          <CityMap
            cities={active}
            works={allWorks ?? []}
            value={citySlug}
            onChange={(slug) => {
              update({ city: slug });
              setKind(null);
            }}
          />
          {active.map((c) => {
            const selected = c.slug === citySlug;
            return (
              <SoftPressable
                key={c.id}
                onPress={() => {
                  update({ city: c.slug });
                  setKind(null);
                  setSheet(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={loc(c.name, lang)}
                accessibilityState={{ selected }}
                style={[s.cityOption, { backgroundColor: selected ? t.primary.fill : t.soft }, !selected && outline(t)]}>
                <Text style={[type.title, { color: selected ? t.primary.ink : t.text, flex: 1 }]}>{loc(c.name, lang)}</Text>
                {selected ? <CheckIcon color={t.primary.ink} size={20} /> : null}
              </SoftPressable>
            );
          })}
          {city ? (
            <Button
              variant="ghost"
              label={tr('design.cityInfo')}
              onPress={() => {
                setSheet(false);
                router.push({ pathname: '/city/[slug]', params: { slug: city.slug } });
              }}
            />
          ) : null}
        </ScrollView>
      </SweetSheet>
      <WorkPreviewSheet work={preview} onClose={() => setPreview(null)} onOpen={open} />
    </View>
  );
}

/** Fotoğrafın üstünden aşağı koyulaşan perde (maket: .5 → .05 → .55); yüksek kontrastta opak. */
function HeroShade({ dark }: { dark: boolean }) {
  const t = useSweetTheme();
  if (t.outlined) return <View style={[StyleSheet.absoluteFill, { backgroundColor: t.glass.dark.tint }]} />;
  return (
    <Svg style={StyleSheet.absoluteFill} accessible={false} pointerEvents="none">
      <Defs>
        <LinearGradient id="home-shade" x1="0" y1="0" x2="0" y2="1">
          {/* Açık temada gündüz fotoğrafı aydınlık kalır; yazı gölgesi ve üstteki perde okunurluğu korur. */}
          <Stop offset="0" stopColor={t.glass.dark.tint} stopOpacity={dark ? 0.6 : 0.48} />
          <Stop offset="0.5" stopColor={t.glass.dark.tint} stopOpacity={dark ? 0.3 : 0.2} />
          <Stop offset="1" stopColor={t.glass.dark.tint} stopOpacity={dark ? 0.55 : 0.32} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#home-shade)" />
    </Svg>
  );
}

/** Tümü · Dinle · Oku: eşit genişlikte hap; seçili mürekkep dolgu, altın simge. */
function ModeButton({ tone, on, label, icon, onPress }: { tone: GlassToneName; on: boolean; label: string; icon: (color: string) => ReactNode; onPress: () => void }) {
  const t = useSweetTheme();
  const ink = t.glass[tone];
  // Dolgu altınsa (koyu tema) simge dolgu yazısına döner; yoksa altın dolguda kaybolur.
  const iconColor = on ? (t.outlined || t.primary.fill === t.gold.fill ? t.primary.ink : t.gold.fill) : t.primaryText;
  return (
    <SoftPressable
      onPress={() => {
        if (on) return;
        void Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[s.mode, { backgroundColor: on ? t.primary.fill : `${t.surface}8C` }, outline(t), on && t.outlined && { borderWidth: 3 }]}>
      {icon(iconColor)}
      <Text style={[type.bubble, { fontSize: 13.5, color: on ? t.primary.ink : ink.text }]}>{label}</Text>
    </SoftPressable>
  );
}

function SectionHead({ title, action, onAction, tone }: { title: string; action: string; onAction: () => void; tone: GlassToneName }) {
  const t = useSweetTheme();
  return (
    <View style={s.sectionHead}>
      <RichTitle text={title} style={{ fontFamily: font.serif, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, color: t.glass[tone].text, flex: 1 }} />
      <SoftPressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action} style={s.link} feedback="opacity">
        <Text style={[type.bubble, { fontSize: 12.5, color: t.glass[tone].muted }]}>{action}</Text>
      </SoftPressable>
    </View>
  );
}

/**
 * "Hemen yanında" kartı (maketteki `.nc`): fotoğrafın solunda buzlu cam yarım (ad, tür · dönem, erişim ve ses
 * etiketleri), sağ üstte cam mesafe hapı, sağ altta altın oynat düğmesi; fotoğraf atfı solda altta.
 */
function NearCard({
  work,
  meta,
  distance,
  hasAudio,
  playing,
  onOpen,
  onToggleAudio,
}: {
  work: WorkRow;
  meta: string;
  distance: string | null;
  hasAudio: boolean;
  playing: boolean;
  onOpen: () => void;
  onToggleAudio: () => void;
}) {
  const t = useSweetTheme();
  const tone = useIsDark() && !t.outlined ? 'dark' : 'light';
  const ink = t.glass[tone];
  const { t: tr, lang } = useT();
  const photo = coverOf(work);
  const ok = t.tones.teal;
  const tags = [work.visit_steps === 0 ? tr('discover.stepFree') : null, work.visit_ramp ? tr('discover.ramp') : null].filter((x): x is string => !!x);
  return (
    <View style={[s.nearCard, { backgroundColor: t.soft }]}>
      <GlassScope>
        <GlassTarget style={StyleSheet.absoluteFill}>
          {photo ? <Image source={{ uri: photoUrl(photo, 'thumb') }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : null}
        </GlassTarget>
        <SoftPressable
          onPress={onOpen}
          feedback="opacity"
          accessibilityRole="button"
          accessibilityLabel={[loc(work.name, lang), meta, ...tags, distance].filter(Boolean).join('. ')}
          accessibilityHint={tr('explore.cardHint')}
          style={StyleSheet.absoluteFill}>
          <Glass tone={tone} style={s.nearPanel}>
            <View>
              <Text style={{ fontFamily: font.serif, fontSize: 20, lineHeight: 21, color: ink.text }} numberOfLines={3}>
                {loc(work.name, lang)}
              </Text>
              <Text style={[type.meta, { fontSize: 11.5, lineHeight: 15, marginTop: 4, color: ink.muted }]} numberOfLines={2}>
                {meta}
              </Text>
            </View>
            <View style={s.tags}>
              {tags.map((tag) => (
                <View key={tag} style={[s.tag, { backgroundColor: ok.fill }, outline(t)]}>
                  <Text style={[s.tagText, { color: ok.ink }]}>{tag}</Text>
                </View>
              ))}
              {hasAudio ? (
                <View style={[s.tag, { backgroundColor: `${ink.text}14` }, outline(t)]}>
                  <Text style={[s.tagText, { color: ink.text }]}>{tr('discover.audio')}</Text>
                </View>
              ) : null}
            </View>
          </Glass>
        </SoftPressable>
        {distance ? (
          <Glass tone={tone} radius={radius.pill} style={s.distance}>
            <Text style={[s.tagText, { fontSize: 11.5, color: ink.text }]}>{distance}</Text>
          </Glass>
        ) : null}
        {hasAudio ? (
          <SoftPressable
            onPress={onToggleAudio}
            hitSlop={5}
            style={[s.play, { backgroundColor: t.gold.fill }]}
            accessibilityRole="button"
            accessibilityLabel={`${playing ? tr('work.stop') : tr('work.listen')}: ${loc(work.name, lang)}`}>
            {playing ? <StopIcon color={t.gold.ink} size={14} /> : <PlayIcon color={t.gold.ink} size={14} />}
          </SoftPressable>
        ) : null}
      </GlassScope>
      <PhotoSourceTag photo={photo} position="bottom-right" style={hasAudio ? s.nearSourceBeside : undefined} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  hero: { height: HERO_H },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: HERO_H },
  stretch: { transformOrigin: 'bottom' },
  heroContent: { flex: 1, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  catButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  catImage: { width: 62, height: 48 },
  city: { minHeight: 48, paddingLeft: 12, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  heroText: { paddingTop: 18, paddingHorizontal: 6, gap: 8 },
  display: { fontFamily: font.serif, fontSize: 44, lineHeight: 44, letterSpacing: -1.5 },
  search: { marginTop: 6, flexDirection: 'row', alignItems: 'center', paddingRight: 4, minHeight: 56 },
  searchField: { flex: 1, minWidth: 0, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 18 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 56, paddingVertical: 0, fontSize: 15 },
  // Dokunma alanı en az 48 dp (çubuk 56 dp, sağda 4 dp pay).
  searchBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -SHEET_OVERLAP, paddingTop: 12, paddingBottom: space.sm },
  sheetGlass: { borderTopLeftRadius: 34, borderTopRightRadius: 34, borderCurve: 'continuous' },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  modes: { flexDirection: 'row', gap: 6, paddingHorizontal: 18 },
  mode: { flex: 1, minHeight: 48, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingHorizontal: 20, gap: space.sm },
  link: { minHeight: 48, justifyContent: 'center', paddingLeft: space.sm },
  carousel: { paddingHorizontal: 18, gap: 10 },
  nearCard: { width: 236, height: 166, borderRadius: 26, borderCurve: 'continuous', overflow: 'hidden' },
  nearPanel: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '52%', paddingTop: 14, paddingRight: 10, paddingBottom: 12, paddingLeft: 14, justifyContent: 'space-between' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 4 },
  tagText: { fontFamily: font.bodyBold, fontSize: 10.5, lineHeight: 13 },
  distance: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 5 },
  play: { position: 'absolute', right: 12, bottom: 12, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  // © işareti oynat düğmesinin (sağdan 12 + 38) solunda.
  nearSourceBeside: { right: 58, bottom: 18 },
  todayWrap: { marginHorizontal: 18 },
  // Fotoğraf kartın tamamında görünür; yazı alttaki örtünün üstünde, © işareti sağ üstte (48 dp alanı yazıya binmez).
  today: { height: 168, borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden' },
  todayPath: { position: 'absolute', top: 14, left: 0, right: 0, height: 72 },
  todayInfo: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.sm, paddingBottom: space.lg, paddingLeft: space.lg, paddingRight: space.md, flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  todayTitle: { fontFamily: font.serif, fontSize: 22, lineHeight: 27 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  gridRow: { paddingHorizontal: space.xl, gap: space.md, marginBottom: space.md },
  state: { alignItems: 'center', gap: space.lg, padding: space.xl },
  sheetBody: { paddingHorizontal: space.xl, gap: space.sm, paddingBottom: space.sm },
  cityOption: { minHeight: 64, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, gap: space.md },
});
