import { coverOf, distanceM, hasLocation, inventorySource, isAttributed, loc, splitReadAlong, toneForType, type SweetTheme, type WorkRow } from '@sezi/shared';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Linking, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingHeader, useFloatingHeaderScroll } from '@/components/floating-header';
import { Glass, GlassScope, GlassTarget } from '@/components/glass';
import { RichTitle } from '@/components/rich-title';
import { SeziLoader } from '@/components/sezi-loader';
import { SeziMap, WorkPin } from '@/components/map';
import { PhotoViewer } from '@/components/photo-viewer';
import { formatPhotoCredit } from '@/components/photo-source';
import { ReadAlongText } from '@/components/read-along-text';
import { ReadMore } from '@/components/read-more';
import { Badge, Button, Card, EmptyState, Eyebrow, ListRow, Note, Segmented } from '@/components/ui';
import { WorkFacts } from '@/components/work-facts';
import { WorkVisit } from '@/components/work-visit';
import { ExternalIcon, PlayIcon, ShareIcon, StopIcon } from '@/design/icons';
import { FadeInItem, IconBubble, outline, PopIn, SoftPressable, sweetShadow } from '@/design/sweet/components';
import { duration, ease } from '@/design/sweet/motion';
import { radius, space, type } from '@/design/type';
import { WorkGlyphInline } from '@/design/work-glyph';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { formatDistance, hasRouteTo, planRoute, walkingSpeed } from '@/lib/nav';
import { useProfile } from '@/lib/profile';
import { useSettings } from '@/lib/settings';
import { useAccount } from '@/lib/account';
import { checkInHere } from '@/lib/checkin';
import { usePassport } from '@/lib/passport';
import { usePhotoUrls, useWorkCommunityPhotos } from '@/lib/photos';
import { AUDIO_BASE } from '@/lib/supabase';
import { createClipPlayer } from '@/lib/voice/clip-player';
import { useReadAlong } from '@/lib/voice/read-along';
import { NARRATION_WAIT_MS, say, silence } from '@/lib/voice/speech';
import { photoUrl, useWork } from '@/lib/works';

/** Eser ses kaydı oynatıcısı (admin panelinden yüklenen kayıt). */
const workClip = createClipPlayer();

export default function WorkDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useSweetTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { t: tr } = useT();
  const { data: work, isLoading, error } = useWork(slug);
  const header = useFloatingHeaderScroll();

  if (isLoading) {
    return (
      <View style={s.center}>
        <FloatingHeader title={tr('work.loading')} scrollY={header.scrollY} coverHeight={header.coverHeight} />
        <SeziLoader label={tr('work.loading')} />
      </View>
    );
  }
  if (error || !work) {
    return (
      <View style={s.center}>
        <FloatingHeader title={tr('work.error')} scrollY={header.scrollY} coverHeight={header.coverHeight} />
        <EmptyState title={error ? tr('work.error') : tr('work.notFound')} />
      </View>
    );
  }
  return <Detail work={work} t={t} s={s} />;
}

/** Eşli okunabilen bölümler. */
type ReadKey = 'summary' | 'history' | 'architecture';
/** Yer kartının sekmeleri. */
type WorkTab = 'about' | 'visit' | 'record';

/** Fotoğraflı eser kapağı, erişim ve anlatım eylemleri; ayrıntılar üç sekmede korunur. */
function Detail({ work, t, s }: { work: WorkRow; t: SweetTheme; s: ReturnType<typeof makeStyles> }) {
  /** Genel anlatım (ad, yer, tarihçe; varsa insan kaydı). Bölümler ayrıca eşli okunur. */
  const [speaking, setSpeaking] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const header = useFloatingHeaderScroll();
  const insets = useSafeAreaInsets();
  const heroHeight = useWindowDimensions().height * 0.78;
  const reduced = useReducedMotion();
  const { t: tr, lang } = useT();
  const { profile } = useProfile();
  const { settings } = useSettings();
  const { has, record } = usePassport();
  const { user } = useAccount();
  const community = useWorkCommunityPhotos(work.slug);
  const communityPaths = useMemo(
    () => (community.data ?? []).map((photo) => photo.thumb_path),
    [community.data],
  );
  const communityUrls = usePhotoUrls(communityPaths);
  const [checking, setChecking] = useState(false);
  // Mesafe ölçüldüğü eserle birlikte tutulur: başka esere geçince eski değer gösterilmez.
  const [measured, setMeasured] = useState<{ slug: string; m: number } | null>(null);
  const distance = measured?.slug === work.slug ? measured.m : null;
  useEffect(() => {
    let active = true;
    if (hasLocation(work)) {
      void (async () => {
        try {
          const permission = await Location.getForegroundPermissionsAsync();
          if (permission.status !== 'granted') return;
          const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (active) setMeasured({ slug: work.slug, m: Math.round(distanceM([fix.coords.longitude, fix.coords.latitude], [work.lng, work.lat])) });
        } catch {
          // Konum alınamazsa mesafe gösterilmez.
        }
      })();
    }
    return () => { active = false; };
  }, [work]);
  const [checkinNote, setCheckinNote] = useState<string | null>(null);
  // Onay bu oturumda verildiyse rozet bir kez canlanır; sayfa sonradan açılınca durağan durur.
  const [justVisited, setJustVisited] = useState(false);
  // Onay anında rozet eklenir ve Buradayım karosu kalkar; kısa bir süre kartın parçaları yeni yerine kayar.
  const [settling, setSettling] = useState(false);
  useEffect(() => {
    if (!settling) return;
    const id = setTimeout(() => setSettling(false), duration.enter * 2);
    return () => clearTimeout(id);
  }, [settling]);
  const checkHere = async () => {
    setChecking(true);
    setCheckinNote(null);
    try {
      const result = await checkInHere(work);
      if (result.ok) {
        setJustVisited(true);
        setSettling(true);
        record(work.slug, 'checkin', null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility(tr('checkin.done'));
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setCheckinNote(
          result.reason === 'far'
            ? tr('checkin.far', { m: Math.round(result.distanceM ?? 0) })
            : result.reason === 'permission'
              ? tr('checkin.permission')
              : result.reason === 'imprecise_place' || result.reason === 'no_location'
                ? tr('checkin.imprecise')
                : tr('checkin.weak'),
        );
      }
    } finally {
      setChecking(false);
    }
  };
  const reader = useReadAlong({ lang, rate: settings.speechRate });
  const name = loc(work.name, lang);
  const kind = loc(work.type_name, lang);
  const city = loc(work.city_name, lang);
  const summary = loc(work.summary, lang);
  const history = loc(work.history, lang);
  const architecture = loc(work.architecture, lang);
  const period = loc(work.period, lang);
  const address = loc(work.address, lang);
  const cover = coverOf(work);
  const tone = t.tones[toneForType(work.type_slug)];
  const inv = inventorySource(work);
  const ref = inv?.page ? (inv.volume ? tr('inv.refShort', { v: inv.volume, page: inv.page }) : tr('inv.refPage', { page: inv.page })) : null;
  const otherSources = work.sources.filter((x) => x.kind !== 'inventory');
  const route = profile && hasRouteTo(work.slug) ? planRoute(work.slug, profile) : null;
  const canHear = profile?.hearing !== 'deaf';
  const place = [work.district, city].filter(Boolean).join(', ');
  const coverCredit = cover && isAttributed(cover) ? formatPhotoCredit(cover, lang) : null;
  const readable = useMemo(
    () => ({ summary: splitReadAlong(summary), history: splitReadAlong(history), architecture: splitReadAlong(architecture) }),
    [summary, history, architecture],
  );

  useEffect(
    () => () => {
      workClip.stop();
      silence();
    },
    [],
  );

  const narration = [name, kind, place, period, history || (ref ? tr('work.historyRef', { ref }) : tr('work.historyInBook'))].filter(Boolean).join('. ');
  // İngilizcede TR kayda düşülmez: metin cihaz sesiyle okunur.
  const audioPath = lang === 'en' ? work.audio_en : work.audio_tr;
  const stopMain = () => {
    workClip.stop();
    silence();
    setSpeaking(false);
  };
  const toggleSpeech = () => {
    if (speaking) return stopMain();
    reader.stop();
    setSpeaking(true);
    const end = () => setSpeaking(false);
    const tts = () => say(narration, { lang, rate: settings.speechRate, interrupt: true, waitMs: NARRATION_WAIT_MS, onDone: end });
    if (!audioPath) return tts();
    silence();
    // İnsan kaydı hızlandırılmaz.
    workClip.play(AUDIO_BASE + audioPath, { onEnd: end, onError: tts });
  };
  // Okunan paragraf ekranda tutulur; kullanıcı kendisi kaydırınca (ya da başka bölüme geçince) takip bırakılır.
  const follow = useRef(true);
  const toggleRead = (key: ReadKey) => {
    if (reader.active === key) return reader.stop();
    workClip.stop();
    setSpeaking(false);
    follow.current = true;
    reader.start(key, readable[key].flat());
  };
  const citation = inv ? `${name}. ${inv.title}${ref ? `, ${ref}` : ''}. Vakıf Katılım${inv.year ? `, ${inv.year}` : ''}.${inv.url ? ` ${inv.url}` : ''}` : null;

  // Bölüm konumları gövdeye göre ölçülür; "Kısalt" ve eşli okuma sayfayı buna göre kaydırır.
  const scrollRef = useRef<ScrollView>(null);
  const bodyRef = useRef<View>(null);
  const bodyY = useRef(0);
  // Ölçümler yalnız olaylarda okunur; render sırasında okunmasın diye ref değil sabit Map.
  const [sectionY] = useState(() => new Map<ReadKey, number>());
  const scrollToBodyY = (y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, bodyY.current + y - insets.top - 72), animated: !reduced });
  // Bölüm konumu sekme gövdesine göre ölçülür; sekmenin kart içindeki yeri ayrıca eklenir.
  const tabY = useRef(0);
  const backTo = (key: ReadKey) => scrollToBodyY(tabY.current + (sectionY.get(key) ?? 0));
  const revealParagraph = (node: View) => {
    if (follow.current && bodyRef.current) node.measureLayout(bodyRef.current, (_x, y) => scrollToBodyY(y - space.lg));
  };
  const place_ = (key: ReadKey) => (y: number) => {
    sectionY.set(key, y);
  };
  const readLabels: Record<string, string> = { summary: tr('work.summary'), history: tr('work.history'), architecture: tr('work.architecture') };

  /** Eşli okunan metin; okunmuyorken uzun metin kısa hâliyle (ReadMore). */
  const readBody = (key: ReadKey, text: string) =>
    reader.active === key ? (
      <ReadAlongText paragraphs={readable[key]} current={reader.index} t={t} onParagraph={revealParagraph} />
    ) : (
      <ReadMore text={text} onCollapse={() => backTo(key)} />
    );
  /** Uzun metnin başlığındaki tek dinle düğmesi (yuvarlak, 48 dp); okunurken durdurur. */
  const listen = (key: ReadKey) =>
    canHear ? (
      <IconBubble
        label={reader.active === key ? tr('work.stop') : `${tr('work.listenSection')}. ${tr('work.listenSectionHint')}`}
        onPress={() => toggleRead(key)}
        icon={(c) => (reader.active === key ? <StopIcon color={c} /> : <PlayIcon color={c} />)}
      />
    ) : undefined;
  const directions = hasRouteTo(work.slug);
  const canCheckIn = !has(work.slug) && hasLocation(work);
  const communityPhotos = community.data ?? [];
  const addPhoto = () => router.push({ pathname: '/photos/new', params: { work: work.slug } });
  const [tab, setTab] = useState<WorkTab>('about');

  // Yürüme süresi yalnız yürünecek uzaklıkta (≤ 5 km) yazılır; ötesinde yalnız mesafe.
  const walkMin = distance !== null && distance <= 5000 && profile ? Math.max(1, Math.round(distance / walkingSpeed(profile) / 60)) : null;
  const distanceText =
    distance === null ? null : walkMin !== null ? tr('work.distanceValue', { minutes: walkMin, distance: formatDistance(distance, lang) }) : formatDistance(distance, lang);
  const accessLabels = [
    work.visit_steps === 0 ? tr('work.visitStepFree') : work.visit_steps !== null ? tr('work.visitSteps', { n: work.visit_steps }) : null,
    work.visit_ramp ? tr('work.visitRamp') : null,
  ].filter((label): label is string => !!label);

  /** Hakkında: kısa özet öne, uzun metinler başlığındaki tek düğmeyle dinlenir; kitap atfı bir kez. */
  const about = (
    <View style={s.tabBody} onLayout={(e) => (tabY.current = e.nativeEvent.layout.y)}>
      {summary ? (
        <View style={{ gap: space.sm }}>
          <Text style={[type.lead, { color: t.text }]}>{summary}</Text>
          <Text style={[type.meta, { color: t.textMuted }]}>{tr('work.summarySource')}</Text>
        </View>
      ) : null}
      <Section title={tr('work.history')} t={t} onLayout={place_('history')} action={history ? listen('history') : undefined}>
        {history ? readBody('history', history) : <Text style={[type.body, { color: t.textMuted }]}>{ref ? tr('work.historyRef', { ref }) : tr('work.historyInBook')}</Text>}
      </Section>
      {architecture ? (
        <Section title={tr('work.architecture')} t={t} onLayout={place_('architecture')} action={listen('architecture')}>
          {readBody('architecture', architecture)}
        </Section>
      ) : null}
      {(history || architecture) && inv ? (
        // Kitap başlığı cildi zaten içerir ("… — Cilt 1"); burada yalnız sayfa eklenir.
        <Text style={[type.meta, { color: t.textMuted }]}>{tr('work.textSource', { book: [inv.title, inv.page ? tr('inv.refPage', { page: inv.page }) : null].filter(Boolean).join(', ') })}</Text>
      ) : null}
    </View>
  );

  /** Ziyaret: harita ve adres önce, sonra gitmeden önce bilinenler ve ziyaretçi fotoğrafları. */
  const visit = (
    <View style={s.tabBody}>
      <View style={{ gap: space.md }}>
        {hasLocation(work) ? (
          <SeziMap
            style={[s.map, outline(t)]}
            interactive={false}
            initial={[[work.lng, work.lat]]}
            initialZoom={work.location_precision === 'exact' ? 16.5 : 15}
            accessibilityLabel={address ?? loc(work.name, 'tr')}>
            <WorkPin location={[work.lng, work.lat]} approximate={work.location_precision !== 'exact'} typeSlug={work.type_slug} />
          </SeziMap>
        ) : null}
        {address ? <Text style={[type.body, { color: t.text }]}>{address}</Text> : null}
        {!hasLocation(work) ? <Text style={[type.body, { color: t.textMuted }]}>{tr('inv.unlocated')}</Text> : null}
        {hasLocation(work) && work.location_precision !== 'exact' ? <Text style={[type.meta, { color: t.textMuted }]}>{tr('work.mapApprox')}</Text> : null}
      </View>
      <Section title={tr('work.visit')} t={t}>
        <WorkVisit work={work} route={route} profile={profile} t={t} />
      </Section>
      {communityPhotos.length || user ? (
        <Section title={tr('work.community')} t={t} action={user ? <Button compact variant="ghost" label={tr('photos.add')} onPress={addPhoto} /> : undefined}>
          {communityPhotos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.xl }} style={{ marginHorizontal: -space.xl }}>
              {communityPhotos.map((photo) => (
                <View key={photo.id} style={{ width: 132, gap: space.xs }}>
                  <Image source={{ uri: communityUrls.data?.[photo.thumb_path] }} style={[s.thumb, outline(t)]} contentFit="cover" accessible accessibilityLabel={photo.alt_text} />
                  <Text style={[type.meta, { color: t.textMuted }]}>{tr('photos.credit', { name: photo.credit_name ?? '' })}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={[type.body, { color: t.textMuted }]}>{tr('work.communityEmpty')}</Text>
          )}
        </Section>
      ) : null}
    </View>
  );

  /** Künye: bilgi kartı (envanter kitabı burada açılır), sergiler, diğer kaynaklar ve atıf. */
  const record_ = (
    <View style={s.tabBody}>
      <WorkFacts work={work} t={t} />
      {work.exhibitions.length ? (
        <Section title={tr('work.exhibitions')} t={t}>
          <Card padded={false}>
            {work.exhibitions.map((e, i) => (
              <ListRow key={e.slug} first={i === 0} title={loc(e.title, lang)} subtitle={loc(e.venue, lang)} onPress={() => router.push('/exhibitions')} />
            ))}
          </Card>
        </Section>
      ) : null}
      {otherSources.length || citation ? (
        <Section title={tr('work.sources')} t={t}>
          <Card padded={false}>
            {otherSources.map((src, i) => (
              <ListRow
                key={src.id}
                first={i === 0}
                title={src.title}
                subtitle={[src.publisher, src.year].filter(Boolean).join(' · ')}
                hint={src.url ? tr('work.sourceHint') : undefined}
                onPress={src.url ? () => void Linking.openURL(src.url!) : undefined}
                trailing={src.url ? <ExternalIcon color={t.primaryText} /> : null}
              />
            ))}
            {citation ? <ListRow first={otherSources.length === 0} title={tr('inv.cite')} subtitle={tr('work.citeHint')} onPress={() => void Share.share({ message: citation })} /> : null}
          </Card>
        </Section>
      ) : null}
    </View>
  );

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: space.xxl + insets.bottom + (reader.active ? 96 : 0) }}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          follow.current = false;
        }}
        onScroll={header.onScroll}>
        <GlassScope>
          <View style={{ height: heroHeight }} onLayout={(e) => header.coverHeight.set(Math.max(1, e.nativeEvent.layout.height - insets.top - 64))}>
            <GlassTarget style={StyleSheet.absoluteFill}>
              {cover ? (
                <SoftPressable feedback="opacity" onPress={() => setViewer(0)} accessibilityRole="imagebutton"
                  accessibilityLabel={[loc(cover.alt, lang), tr('work.openPhotos')].filter(Boolean).join('. ')}>
                  <Image source={{ uri: photoUrl(cover, 'full') }} placeholder={{ uri: photoUrl(cover, 'thumb') }} style={[s.heroImg, { height: heroHeight }]} contentFit="cover" accessible={false} />
                </SoftPressable>
              ) : (
                <View style={[s.plainHero, { height: heroHeight, backgroundColor: tone.fill }]} accessible={false}>
                  <WorkGlyphInline slug={work.type_slug} color={tone.ink} size={112} />
                </View>
              )}
            </GlassTarget>
            <Glass tone="light" style={[s.heroPanel, { paddingTop: insets.top + 72 }]}>
              <Eyebrow text={kind} />
              <RichTitle text={name} style={type.screenTitle} />
              {place ? <HeroFact label={tr('work.location')} value={place} t={t} /> : null}
              {period ? <HeroFact label={tr('work.fact.period')} value={period} t={t} /> : null}
              {distanceText ? <HeroFact label={tr('work.distance')} value={distanceText} t={t} /> : null}
              {work.built_year ? <Text style={[type.title, { color: t.glass.light.text, marginTop: 'auto' }]}>{work.built_year}</Text> : null}
            </Glass>
            {coverCredit ? <Glass tone="dark" radius={radius.pill} style={s.photoCredit}><Text style={[type.bubble, { color: t.glass.dark.text }]} numberOfLines={1}>{coverCredit}</Text></Glass> : null}
            <Glass tone="dark" radius={24} style={[s.share, { top: insets.top + space.sm }]}>
              <SoftPressable style={s.circle} onPress={() => void Share.share({ url: `https://sezi.info/${lang}/eser/${work.slug}`, message: `https://sezi.info/${lang}/eser/${work.slug}` })} accessibilityRole="button" accessibilityLabel={tr('work.share')}>
                <ShareIcon color={t.glass.dark.text} />
              </SoftPressable>
            </Glass>
          </View>
        </GlassScope>

        <View ref={bodyRef} style={s.sheet} onLayout={(e) => (bodyY.current = e.nativeEvent.layout.y)}>
          <Glass tone="dark" radius={radius.xl} style={s.playerCard}>
            {canHear ? (
              <SoftPressable style={s.player} accessibilityRole="button" accessibilityLabel={speaking ? tr('work.stop') : tr('work.listen')} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSpeech(); }}>
                <View style={[s.circle, { backgroundColor: t.gold.fill }]}>{speaking ? <StopIcon color={t.gold.ink} /> : <PlayIcon color={t.gold.ink} />}</View>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Text style={[type.itemTitle, { color: t.glass.dark.text }]}>{speaking ? tr('work.stop') : tr('work.listen')}</Text>
                  <Wave playing={speaking} reduced={reduced} color={t.glass.dark.muted} />
                </View>
              </SoftPressable>
            ) : null}
            {accessLabels.length ? <View style={s.badges}>{accessLabels.map((label) => <View key={label} style={[s.accessTag, { backgroundColor: t.glass.light.tint }]}><Text style={[type.bubble, { color: t.glass.light.text }]}>{label}</Text></View>)}</View> : null}
            {work.unesco || has(work.slug) ? <View style={s.badges}>
              {work.unesco ? <Badge label={tr('work.unesco')} tone="accent" /> : null}
              {has(work.slug) ? <PopIn play={justVisited}><Badge label={tr('work.visited')} tone="primary" /></PopIn> : null}
            </View> : null}
            {directions || canCheckIn ? <View style={s.actions}>
              {directions ? <Button style={{ flex: 1 }} variant="cream" label={tr('work.action.directions')} onPress={() => router.push({ pathname: '/navigate', params: { dest: work.slug } })} /> : null}
              {canCheckIn ? <Button style={{ flex: 1 }} variant="line" disabled={checking} label={checking ? tr('checkin.checking') : tr('checkin.here')} hint={tr('checkin.hint')} onPress={() => void checkHere()} /> : null}
            </View> : null}
          </Glass>
          {checkinNote ? (
            <FadeInItem index={0}>
              <Note text={checkinNote} />
            </FadeInItem>
          ) : null}

          {/* Sekmeler ve içerik açılışta başlık ve eylemlerden sonra gelir; kap sabit kalır, sekme değişince giriş tekrar oynamaz. */}
          <FadeInItem index={3} layout={settling}>
            <Segmented
              label={tr('work.tabs')}
              value={tab}
              onChange={setTab}
              options={[
                { value: 'about', label: tr('work.tab.about') },
                { value: 'visit', label: tr('work.tab.visit') },
                { value: 'record', label: tr('work.tab.record') },
              ]}
            />
          </FadeInItem>
          <FadeInItem index={4} layout={settling}>
            {tab === 'about' ? about : tab === 'visit' ? visit : record_}
          </FadeInItem>
        </View>
      </Animated.ScrollView>
      <FloatingHeader title={name} scrollY={header.scrollY} coverHeight={header.coverHeight} lightOnCover={!!cover} />

      {/* Eşli okuma sürerken durdurma her zaman erişilebilir. Çubuk alttan gelir, aynı kenardan gider; reduce motion: yalnız saydamlık. */}
      {reader.active ? (
        <Animated.View
          entering={reduced ? FadeIn.duration(duration.fade) : FadeInDown.duration(duration.enter).easing(ease.out).withInitialValues({ opacity: 0, transform: [{ translateY: 96 }] })}
          exiting={reduced ? FadeOut.duration(duration.fade) : FadeOutDown.duration(duration.sheetOut).easing(ease.out)}
          style={[s.readingBar, { bottom: insets.bottom + space.lg, backgroundColor: t.surface }, sweetShadow(t)]}
          accessibilityLiveRegion="polite">
          <Text style={[type.itemTitle, { color: t.text, flex: 1 }]} numberOfLines={2}>
            {tr('work.readingSection', { section: readLabels[reader.active] ?? '' })}
          </Text>
          <Button compact label={tr('work.stop')} onPress={reader.stop} icon={(c) => <StopIcon color={c} />} />
        </Animated.View>
      ) : null}

      {work.photos.length ? <PhotoViewer key={viewer ?? -1} photos={work.photos} start={viewer} onClose={() => setViewer(null)} /> : null}
    </View>
  );
}

/** Bölüm: başlık ve varsa sağında tek eylem (dinle ya da fotoğraf ekle). */
function Section({
  title,
  t,
  children,
  onLayout,
  action,
}: {
  title: string;
  t: SweetTheme;
  children: ReactNode;
  onLayout?: (y: number) => void;
  action?: ReactNode;
}) {
  return (
    <View style={{ gap: space.md }} onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 }}>
        <Text style={[type.heading, { color: t.text, flex: 1 }]} accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function HeroFact({ label, value, t }: { label: string; value: string; t: SweetTheme }) {
  return <View style={{ gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
    <Text style={[type.meta, { color: t.glass.light.muted }]}>{label}</Text>
    <Text style={[type.body, { color: t.glass.light.text }]}>{value}</Text>
  </View>;
}

function Wave({ playing, reduced, color }: { playing: boolean; reduced: boolean; color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.set(playing && !reduced ? withRepeat(withTiming(0.4, { duration: 550 }), -1, true) : withTiming(1, { duration: 0 }));
  }, [playing, reduced, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.get() }] }));
  return <View accessible={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 18 }}>
    {[8, 14, 11, 18, 10, 15, 8, 13, 17, 9, 12, 7].map((height, index) => <Animated.View key={index} style={[{ width: 3, height, borderRadius: 2, backgroundColor: color }, index % 2 === 0 && animated]} />)}
  </View>;
}

const makeStyles = (t: SweetTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: t.background },
    heroImg: { width: '100%' },
    heroPanel: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '54%', paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.lg },
    photoCredit: { position: 'absolute', right: space.sm, bottom: space.md, maxWidth: '44%', paddingHorizontal: space.sm, paddingVertical: space.xs },
    share: { position: 'absolute', right: space.lg },
    circle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    plainHero: { alignItems: 'center', justifyContent: 'center' },
    sheet: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.xl },
    playerCard: { padding: space.lg, gap: space.md },
    player: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
    accessTag: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    actions: { flexDirection: 'row', gap: space.sm },
    tabBody: { gap: space.xxl, paddingTop: space.sm },
    readingBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingLeft: space.lg, paddingRight: space.sm, borderRadius: radius.xl, borderCurve: 'continuous' },
    thumb: { width: 132, height: 132, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: t.soft },
    map: { height: 180, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: t.soft },
  });
