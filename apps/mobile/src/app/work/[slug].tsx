import { coverOf, hasLocation, inventorySource, isAttributed, loc, splitReadAlong, toneForType, type SweetTheme, type WorkRow } from '@sezi/shared';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Linking, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingHeader, useFloatingHeaderScroll } from '@/components/floating-header';
import { SeziLoader } from '@/components/sezi-loader';
import { SeziMap, WorkPin } from '@/components/map';
import { PhotoViewer } from '@/components/photo-viewer';
import { formatPhotoCredit } from '@/components/photo-source';
import { ReadAlongText } from '@/components/read-along-text';
import { ReadMore } from '@/components/read-more';
import { Badge, Button, Card, EmptyState, ListRow, Note, Segmented } from '@/components/ui';
import { WorkFacts } from '@/components/work-facts';
import { WorkVisit } from '@/components/work-visit';
import { CameraIcon, ExternalIcon, PinIcon, PlayIcon, StopIcon, TurnIcon } from '@/design/icons';
import { FadeInItem, IconBubble, outline, PopIn, SoftPressable, sweetShadow } from '@/design/sweet/components';
import { duration, ease } from '@/design/sweet/motion';
import { radius, space, type } from '@/design/type';
import { WorkGlyphInline } from '@/design/work-glyph';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { hasRouteTo, planRoute, walkingSpeed } from '@/lib/nav';
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

/**
 * Eser sayfası (yer kartı): yazısız tam kapak fotoğrafı, üstüne binen kartta ad, tür ve yer, kayıtta olan kısa
 * bakış (yapım, dönem, yürüme, gezme), eşit eylem karoları (yol tarifi, dinle, buradayım), sonra üç sekme:
 * Hakkında (özet ve eşli okunan metinler), Ziyaret (harita, gitmeden önce, ziyaretçi fotoğrafları), Künye (bilgi
 * kartı, sergiler, kaynaklar). Uzun sayfa yerine sekme; her eylem bir kez.
 */
function Detail({ work, t, s }: { work: WorkRow; t: SweetTheme; s: ReturnType<typeof makeStyles> }) {
  /** Genel anlatım (ad, yer, tarihçe; varsa insan kaydı). Bölümler ayrıca eşli okunur. */
  const [speaking, setSpeaking] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const header = useFloatingHeaderScroll();
  const insets = useSafeAreaInsets();
  // Kapak tam genişlik; 4:5 oran en fazla 520 dp yükseklikle (aspectRatio + maxHeight genişliği daraltıyordu).
  const heroHeight = Math.min(useWindowDimensions().width * 5 / 4, 520);
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

  // Kısa bakış: kayıtta olan ilk üç bilgi (yapım, dönem, pilot alanda yürüme, gezme süresi). Uydurma yok.
  const walkMin = route && profile ? Math.max(1, Math.round(route.route.lengthM / walkingSpeed(profile) / 60)) : null;
  const glance = [
    work.built_year ? { key: 'built', label: tr('work.fact.built'), value: String(work.built_year) } : null,
    period ? { key: 'period', label: tr('work.fact.period'), value: period } : null,
    walkMin ? { key: 'walk', label: tr('work.glance.walk'), value: tr('work.minutes', { n: walkMin }) } : null,
    work.visit_minutes ? { key: 'visit', label: tr('work.glance.visit'), value: tr('work.minutes', { n: work.visit_minutes }) } : null,
  ]
    .filter((x) => x !== null)
    .slice(0, 3);
  // Tek bilgi şerit olmaz (yarım kalmış görünür); o bilgi Ziyaret ya da Künye sekmesinde zaten var.
  const showGlance = glance.length >= 2;

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
        {/* Kapak: yazısız tam fotoğraf (ad aşağıdaki kartta), atıf ve fotoğraf sayısı üstünde; dokununca tüm fotoğraflar
            açılır. Fotoğraf yoksa tür tonunda glif. Üst çubuk, kartın üst kenarı çubuğun altına değdiği an belirir. */}
        <View onLayout={(e) => header.coverHeight.set(Math.max(1, e.nativeEvent.layout.height - radius.xl - insets.top - 64))}>
          {cover ? (
            <SoftPressable
              feedback="opacity"
              onPress={() => setViewer(0)}
              accessibilityRole="imagebutton"
              accessibilityLabel={[loc(cover.alt, lang), work.photos.length > 1 ? tr('work.photoCount', { n: work.photos.length }) : null, tr('work.openPhotos')].filter(Boolean).join('. ')}>
              <Image source={{ uri: photoUrl(cover, 'full') }} placeholder={{ uri: photoUrl(cover, 'thumb') }} placeholderContentFit="cover" style={[s.heroImg, { height: heroHeight }]} contentFit="cover" transition={150} accessible={false} />
              {coverCredit ? (
                <View style={[s.photoCredit, { backgroundColor: t.surface }, outline(t)]} pointerEvents="none">
                  <Text style={[type.bubble, { color: t.text }]} numberOfLines={1}>{coverCredit}</Text>
                </View>
              ) : null}
              {work.photos.length > 1 ? (
                <View style={[s.photoCount, { backgroundColor: t.surface }, outline(t)]} pointerEvents="none">
                  <CameraIcon color={t.text} size={16} />
                  <Text style={[type.bubble, { color: t.text }]}>{work.photos.length}</Text>
                </View>
              ) : null}
            </SoftPressable>
          ) : (
            <View style={[s.plainHero, { height: Math.min(heroHeight, 360), paddingTop: insets.top, backgroundColor: tone.fill }]} accessible={false}>
              <WorkGlyphInline slug={work.type_slug} color={tone.ink} size={112} />
            </View>
          )}
        </View>

        {/* Yer kartı: kapağın üstüne biner; ad, tür ve yer, kısa bakış, eylemler, sonra sekmeler. */}
        <View ref={bodyRef} style={[s.sheet, { backgroundColor: t.background }, t.outlined && { borderTopWidth: 2, borderColor: t.border }]} onLayout={(e) => (bodyY.current = e.nativeEvent.layout.y)}>
          <FadeInItem index={0} style={{ gap: space.sm }}>
            <Text style={[type.editorial, { color: t.text }]} accessibilityRole="header">{name}</Text>
            <Text style={[type.meta, { color: t.textMuted }]}>{[kind, place].filter(Boolean).join(' · ')}</Text>
            {work.unesco || has(work.slug) ? (
              <View style={s.badges}>
                {work.unesco ? <Badge label={tr('work.unesco')} tone="accent" /> : null}
                {has(work.slug) ? (
                  <PopIn play={justVisited}>
                    <Badge label={tr('work.visited')} tone="primary" />
                  </PopIn>
                ) : null}
              </View>
            ) : null}
          </FadeInItem>

          {showGlance ? (
            <FadeInItem index={1} layout={settling} style={s.glance}>
              {glance.map((g) => (
                <View key={g.key} style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${g.label}: ${g.value}`}>
                  <Text style={[type.meta, { color: t.textMuted }]}>{g.label}</Text>
                  <Text style={[type.itemTitle, { color: t.text }]} numberOfLines={2}>{g.value}</Text>
                </View>
              ))}
            </FadeInItem>
          ) : null}

          {/* Eylemler eşit karolar: yol tarifi (pilot alanda), dinle (işiten profilde), buradayım (ziyaret edilmemişse). */}
          {directions || canHear || canCheckIn ? (
            <FadeInItem index={2} layout={settling} style={s.actions}>
              {directions ? (
                <ActionTile t={t} primary label={tr('work.action.directions')} icon={(c) => <TurnIcon turn="slight_right" color={c} />} onPress={() => router.push({ pathname: '/navigate', params: { dest: work.slug } })} />
              ) : null}
              {canHear ? (
                <ActionTile t={t} primary={!directions} label={speaking ? tr('work.stop') : tr('work.listen')} icon={(c) => (speaking ? <StopIcon color={c} /> : <PlayIcon color={c} />)} onPress={toggleSpeech} />
              ) : null}
              {canCheckIn ? (
                <ActionTile t={t} busy={checking} label={checking ? tr('checkin.checking') : tr('checkin.here')} hint={tr('checkin.hint')} icon={(c) => <PinIcon color={c} />} onPress={checking ? undefined : () => void checkHere()} />
              ) : null}
            </FadeInItem>
          ) : null}
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

/**
 * Eylem karosu: simge üstte, kısa etiket altta; karolar satırı eşit böler (en az 76 dp yükseklik). Ana eylem
 * firuze dolgu, diğerleri gri; fark dolgu zıtlığıyla da okunur, yalnız renkle değil. Karo kalkınca soluklaşır, kalanlar
 * genişleyerek yerini doldurur; `busy` iken simge yavaşça nefes alır (iskeletle aynı tarif). Reduce motion: anında.
 */
function ActionTile({
  t,
  label,
  hint,
  icon,
  onPress,
  primary = false,
  busy = false,
}: {
  t: SweetTheme;
  label: string;
  hint?: string;
  icon: (color: string) => ReactNode;
  onPress?: () => void;
  primary?: boolean;
  busy?: boolean;
}) {
  const reduced = useReducedMotion();
  const fg = primary ? t.primary.ink : t.text;
  const iconOpacity = useSharedValue(1);
  useEffect(() => {
    iconOpacity.set(busy && !reduced ? withRepeat(withTiming(0.45, { duration: 900, easing: ease.inOut }), -1, true) : withTiming(1, { duration: duration.fade, easing: ease.out }));
  }, [busy, reduced, iconOpacity]);
  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.get() }));
  return (
    <Animated.View
      style={tileStyle.slot}
      layout={reduced ? undefined : LinearTransition.duration(duration.enter).easing(ease.out)}
      exiting={reduced ? undefined : FadeOut.duration(duration.fade)}>
      <SoftPressable
        feedback="scaleLarge"
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled: !onPress, busy }}
        style={[tileStyle.tile, { backgroundColor: primary ? t.primary.fill : t.soft }, outline(t)]}>
        <Animated.View style={iconStyle}>{icon(fg)}</Animated.View>
        <Text style={[type.button, { fontSize: 15, color: fg, textAlign: 'center' }]} numberOfLines={2}>
          {label}
        </Text>
      </SoftPressable>
    </Animated.View>
  );
}

const tileStyle = StyleSheet.create({
  slot: { flex: 1 },
  tile: { flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.md, borderRadius: radius.lg, borderCurve: 'continuous' },
});

const makeStyles = (t: SweetTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: t.background },
    heroImg: { width: '100%' },
    // Kartın bindiği şeridin üstünde kalır.
    photoCount: { position: 'absolute', right: space.xl, bottom: radius.xl + space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, minHeight: 32, borderRadius: radius.pill, borderCurve: 'continuous' },
    // Fotoğraf atfı fotoğrafın üstünde, metni kadar geniş; sayı rozetine yer bırakır.
    photoCredit: { position: 'absolute', left: space.xl, maxWidth: '68%', bottom: radius.xl + space.md, justifyContent: 'center', paddingHorizontal: space.md, minHeight: 32, borderRadius: radius.pill, borderCurve: 'continuous' },
    plainHero: { alignItems: 'center', justifyContent: 'center' },
    // Yer kartı: kapağın son 28 dp'sine biner, üst köşeleri yuvarlak.
    sheet: { marginTop: -radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderCurve: 'continuous', paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.xl },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
    glance: { flexDirection: 'row', gap: space.lg },
    actions: { flexDirection: 'row', gap: space.sm },
    tabBody: { gap: space.xxl, paddingTop: space.sm },
    readingBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingLeft: space.lg, paddingRight: space.sm, borderRadius: radius.xl, borderCurve: 'continuous' },
    thumb: { width: 132, height: 132, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: t.soft },
    map: { height: 180, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: t.soft },
  });
