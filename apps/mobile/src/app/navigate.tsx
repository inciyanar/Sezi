import { distanceToLineM, pointAlong, sliceLine, type LngLat, type NavPoint, type RoutePiece, type SweetTheme } from '@sezi/shared';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CueFlash } from '@/components/cue-flash';
import { Glass, GlassScope, GlassTarget, type GlassToneName } from '@/components/glass';
import { AltLines, EndPin, ExtraLines, PointsLayer, RouteLine, SeziMap, StopBadges, UserDot, type MapPoint, type SeziMapHandle } from '@/components/map';
import { NavSheet } from '@/components/nav-sheet';
import { PointPopup } from '@/components/point-popup';
import { ArrivalPanel } from '@/components/route/arrival-panel';
import { DestinationSearch } from '@/components/route/destination-search';
import { DevPlanTools, DevWalkTools } from '@/components/route/dev-tools';
import { PlanPanel } from '@/components/route/plan-panel';
import { WalkPanel } from '@/components/route/walk-panel';
import { Text } from '@/components/text';
import { BackIcon, CloseIcon, PinIcon } from '@/design/icons';
import { SoftPressable, sweetShadow } from '@/design/sweet/components';
import { radius, space, type } from '@/design/type';
import { useIsDark, useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { segmentLines, useNavVersion, useStartPoints, walkingSpeed, type StartPoint } from '@/lib/nav';
import { DESTINATIONS, destinationName, destinationOf } from '@/lib/navigation/destinations';
import { navigation, useNavigation, type NavConfig, type NavState } from '@/lib/navigation/session';
import { usePassport } from '@/lib/passport';
import { useNavPoints, useWorkPoints } from '@/lib/points';
import { useProfile } from '@/lib/profile';
import { useSettings } from '@/lib/settings';

/**
 * Rota: plan, yürüyüş ve varış tek ekranda. Az düğme: başlangıç her zaman konum, hedef eserden/turdan gelir
 * (yoksa "Nereye?"), plan aşamasında rota seçenekleri ve tek düğme. Başlangıç seçimi, hız ve senaryolar
 * yalnız geliştirici modunda. Görmeyen profilde harita yok; talimat ekranı kaplar.
 */
export default function Navigate() {
  const params = useLocalSearchParams<{ dest?: string; tour?: string; stroll?: string }>();
  const t = useSweetTheme();
  const dark = useIsDark();
  const tone: GlassToneName = dark && !t.outlined ? 'dark' : 'light';
  const ink = t.glass[tone];
  const s = useMemo(() => makeStyles(t), [t]);
  const { t: tr, lang } = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { profile } = useProfile();
  const { settings } = useSettings();
  const { record } = usePassport();
  const state = useNavigation();
  const points = useNavPoints();
  const workPts = useWorkPoints();
  const starts = useStartPoints();
  const version = useNavVersion();
  const mapRef = useRef<SeziMapHandle>(null);
  const [picking, setPicking] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(height * 0.45);
  const [follow, setFollow] = useState(true);

  // Hedefsiz açılış (ne eser ne tur ne gezinti): önce "Nereye?". Derin bağlantıyla hedef değişince yeniden hesaplanır.
  const paramKey = `${params.dest ?? ''}|${params.tour ?? ''}|${params.stroll ?? ''}`;
  const opensEmpty = !params.dest && !params.tour && !params.stroll;
  const [seenKey, setSeenKey] = useState(paramKey);
  const [searching, setSearching] = useState(opensEmpty);
  const [chosen, setChosen] = useState(!opensEmpty);
  if (seenKey !== paramKey) {
    setSeenKey(paramKey);
    setSearching(opensEmpty);
    setChosen(!opensEmpty);
  }

  const cfg = useMemo<NavConfig | null>(
    () =>
      profile
        ? {
            profile,
            speechRate: settings.speechRate,
            playback: settings.storyPlayback,
            sim: settings.devSimulation,
            onArrive: (slug, walked) => record(slug, 'route', walked),
          }
        : null,
    [profile, settings.speechRate, settings.storyPlayback, settings.devSimulation, record],
  );

  // Ekran açılınca hedef/tur yüklenir; çıkınca her şey susar ve konum izlenmez.
  useEffect(() => {
    if (!cfg) return;
    navigation.configure(cfg);
    const tour = params.tour ? params.tour.split(',').filter(Boolean) : [];
    navigation.open(tour[0] ?? params.dest ?? null, tour.slice(1));
    return () => navigation.close();
    // Ekran açılışında ve hedef/tur parametresi değişince (derin bağlantı); ayar değişiklikleri configure ile gelir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!cfg, params.dest, params.tour]);

  useEffect(() => {
    if (cfg) navigation.configure(cfg);
  }, [cfg]);

  // Noktalar ya da onaylı bildirimler değişince önizleme rotası yenilenir.
  useEffect(() => {
    navigation.refresh();
  }, [version]);

  // Ekran yürüyüş boyunca açık kalır.
  useEffect(() => {
    if (state.phase !== 'active') return;
    void activateKeepAwakeAsync('navigate');
    return () => void deactivateKeepAwake('navigate');
  }, [state.phase]);

  // Plan değişince bütün seçenekler ekrana sığdırılır; yürürken kamera kullanıcıyı izler.
  const plan = state.plan;
  const options = state.options;
  const fitLine = useMemo(() => (options.length > 1 ? options.flatMap((o) => o.plan.geometry.line) : (plan?.geometry.line ?? [])), [options, plan]);
  const allDestCoords = useMemo(() => DESTINATIONS.map((n) => n.landmarkAt ?? n.location), []);
  const fitCoords = !searching && fitLine.length ? fitLine : allDestCoords;
  useEffect(() => {
    if (state.phase !== 'plan' || fitCoords.length === 0) return;
    // Plan paneli ekranın altını kaplar: rota veya seçilebilir hedefler panelin üstünde kalan alana sığdırılır.
    mapRef.current?.fit(fitCoords, { top: insets.top + 72, bottom: sheetHeight + space.lg });
  }, [fitCoords, state.phase, insets.top, sheetHeight]);
  useEffect(() => {
    if (state.phase === 'active' && follow && state.position) mapRef.current?.centerOn(state.position);
  }, [state.position, state.phase, follow]);

  const dev = settings.devSimulation;
  const order = useMemo(() => new Map((plan?.via.pointIds ?? []).map((id, i) => [id, i + 1])), [plan]);
  const mapPoints = useMemo(() => buildMapPoints(points, dev ? starts : [], state, order, lang), [points, dev, starts, state, order, lang]);
  const pieces = useMemo<RoutePiece[]>(() => (plan ? [{ route: plan.route, geometry: plan.geometry, breaksM: plan.via.atM }] : []), [plan]);
  const stopBadges = useMemo(
    () =>
      !plan
        ? []
        : mapPoints.flatMap((point) => {
            if (!point.order) return [];
            const atM = plan.via.atM[point.order - 1];
            const next = state.phase === 'active' ? plan.via.atM.filter((distance) => distance <= state.distance).length + 1 : 1;
            return atM === undefined ? [] : [{ ...point, selected: point.order === next, onLine: pointAlong(plan.geometry.line, atM) }];
          }),
    [plan, mapPoints, state.phase, state.distance],
  );
  const otherPoints = useMemo(() => mapPoints.filter((point) => !point.order), [mapPoints]);
  // Hedef seçilmemişken ("Nereye?" açıkken veya rota yokken) pilot alandaki tüm seçilebilir eserler haritada tür simgesiyle görünür.
  const destPoints = useMemo<MapPoint[]>(
    () =>
      DESTINATIONS.flatMap((n) =>
        n.workSlug
          ? [
              {
                id: n.workSlug,
                location: n.landmarkAt ?? n.location,
                kind: 'work' as const,
                typeSlug: n.workType,
                label: destinationName(n, lang),
                selected: state.dest === n.workSlug,
              },
            ]
          : [],
      ),
    [lang, state.dest],
  );
  const altLines = useMemo(
    () => (state.phase === 'plan' ? options.filter((o) => o.choice !== state.choice).map((o) => ({ id: o.choice, line: o.plan.geometry.line })) : []),
    [options, state.choice, state.phase],
  );

  if (!profile || !cfg) return null;

  const mapless = profile.vision === 'blind';
  const route = state.phase === 'plan' && searching ? null : plan;
  const canHear = profile.hearing !== 'deaf' && profile.senses.audio;
  const popupPoint = state.popup ? (points.find((p) => p.id === state.popup) ?? workPts.find((p) => p.id === state.popup)) : undefined;
  const walked = plan && state.phase === 'active' && state.distance > 1 ? sliceLine(plan.geometry.line, 0, state.distance) : undefined;
  const activeLeg = plan && state.phase === 'active' ? plan.via.atM.filter((atM) => atM <= state.distance).length : null;
  const userAt = state.phase === 'active' ? state.position : state.start.kind === 'here' && !state.virtual ? state.here : null;
  const startAt = state.start.kind === 'pick' ? state.start.location : plan?.geometry.line[0];

  const onMapPress = (p: LngLat) => {
    if (!picking) return;
    setPicking(false);
    navigation.setStart({ kind: 'pick', location: p });
  };
  const onPointPress = (id: string) => {
    if (state.phase !== 'plan' || picking) return;
    if (DESTINATIONS.some((n) => n.workSlug === id)) {
      void Haptics.selectionAsync();
      pickDest(id);
      return;
    }
    if (dev && starts.some((p) => p.id === id)) navigation.setStart({ kind: 'point', id });
  };
  const onAltPress = (id: string) => {
    const option = options.find((o) => o.choice === id);
    if (!option) return;
    void Haptics.selectionAsync();
    navigation.choose(option.choice);
  };
  const pickDest = (slug: string | null) => {
    navigation.setDest(slug);
    setSearching(false);
    setChosen(true);
  };
  // Yürürken X yürüyüşü bitirir (onayla: cebe girerken yanlışlıkla basılmasın); diğer aşamalarda ekranı kapatır.
  const onClose = () => {
    if (state.phase !== 'active') {
      router.back();
      return;
    }
    Alert.alert(tr('nav.endConfirmTitle'), tr('nav.endConfirmBody'), [
      { text: tr('nav.continue'), style: 'cancel' },
      { text: tr('nav.finish'), style: 'destructive', onPress: navigation.stop },
    ]);
  };

  let content: ReactNode;
  if (state.phase === 'plan') {
    content = searching ? (
      <DestinationSearch onPick={pickDest} onCancel={chosen ? () => setSearching(false) : undefined} />
    ) : (
      <>
        <PlanPanel state={state} onChangeDest={() => setSearching(true)} points={[...points, ...workPts]} canHear={canHear} />
        {dev ? <DevPlanTools state={state} starts={starts} points={points} order={order} picking={picking} setPicking={setPicking} /> : null}
      </>
    );
  } else if (state.phase === 'active') {
    content = (
      <>
        <WalkPanel state={state} points={points} order={order} canHear={canHear} hearing={profile.hearing} mps={walkingSpeed(profile)} large={mapless} />
        {dev && state.source === 'sim' ? <DevWalkTools state={state} /> : null}
      </>
    );
  } else {
    content = <ArrivalPanel state={state} points={points} canHear={canHear} />;
  }

  const destination = destinationOf(state.dest);
  const destinationTitle = destination ? destinationName(destination, lang) : tr('nav.stroll');
  const startTitle = state.start.kind === 'here' ? tr('nav.here') : state.start.kind === 'point'
    ? (starts.find((point) => point.id === (state.start.kind === 'point' ? state.start.id : ''))?.name[lang] ?? tr('nav.pickOnMap'))
    : tr('nav.pickOnMap');

  const topBar = (
    <View style={[s.mapBar, { top: insets.top + space.sm }]} pointerEvents="box-none">
      <RoundButton label={state.phase === 'active' ? tr('nav.end') : tr('nav.close')} onPress={onClose} t={t} tone={tone}>
        {state.phase === 'active' ? <CloseIcon color={ink.text} /> : <BackIcon color={ink.text} />}
      </RoundButton>
      <Glass tone={tone} radius={radius.pill} style={s.mapTitle}>
        <Text style={[type.button, { color: ink.text }]} numberOfLines={1}>{destinationTitle}</Text>
        <Text style={[type.meta, { color: ink.muted }]} numberOfLines={1}>{tr('nav.from')}: {startTitle}</Text>
      </Glass>
      {state.phase === 'active' && !mapless ? (
        <RoundButton label={tr('nav.recenter')} onPress={() => setFollow((v) => !v)} t={t} tone={tone} active={follow}>
          <PinIcon color={ink.text} size={20} />
        </RoundButton>
      ) : null}
    </View>
  );
  const popup =
    popupPoint && (state.phase !== 'arrived' || !state.arrived) ? (
      <PointPopup
        point={popupPoint}
        order={order.get(popupPoint.id)}
        playing={state.playing === popupPoint.id}
        canPlay={canHear}
        queued={state.queue.length}
        onPlay={() => navigation.playPoint(popupPoint.id)}
        onStop={navigation.stopAudio}
        onClose={navigation.closePopup}
      />
    ) : null;
  const flash = <CueFlash count={state.cueCount} color={t.accentText} enabled={profile.hearing !== 'full' || !profile.senses.audio || state.noisy} />;

  // Görmeyen profil: harita yok, içerik ekranı kaplar (büyük talimat, tek dokunuşla tekrar).
  if (mapless) {
    return (
      <View style={s.screen}>
        <ScrollView contentContainerStyle={[s.fullBody, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + space.xxl + (popupPoint ? 380 : 0) }]} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
        {topBar}
        {popup}
        {flash}
      </View>
    );
  }

  return (
    <GlassScope>
    <View style={s.screen}>
      <GlassTarget style={{ flex: 1 }}>
      <SeziMap
        ref={mapRef}
        style={{ flex: 1 }}
        initial={fitCoords.length ? fitCoords : starts.map((p) => p.location)}
        initialPadding={{ top: insets.top + 72, bottom: sheetHeight + space.lg }}
        onPress={onMapPress}
        accessibilityLabel={tr('nav.mapLabel', { n: order.size })}>
        {/* "Nereye?" açıkken önceki hedefin rotası çizilmez. */}
        {route && altLines.length ? <AltLines lines={altLines} onPress={onAltPress} /> : null}
        {route ? <RouteLine pieces={pieces} activeLeg={activeLeg} walked={walked} animate={state.phase === 'plan'} /> : null}
        {state.blocked.length ? <ExtraLines id="blocked" data={segmentLines(state.blocked)} color={t.danger} dashed /> : null}
        <PointsLayer points={route ? otherPoints : destPoints} onPress={onPointPress} />
        <StopBadges stops={route ? stopBadges : []} onPress={onPointPress} />
        {route && startAt && state.phase === 'plan' ? <EndPin id="start" location={startAt} kind="start" /> : null}
        {route ? <EndPin id="end" location={route.end.location} kind="end" /> : null}
        {userAt ? <UserDot location={userAt} /> : null}
      </SeziMap>
      </GlassTarget>

      {topBar}
      {picking ? (
        <View style={[s.pickBanner, sweetShadow(t), { top: insets.top + 72 }]} accessibilityLiveRegion="polite">
          <Text style={[type.button, { color: t.primary.ink }]}>{tr('nav.pickHint')}</Text>
        </View>
      ) : null}

      <NavSheet phase={state.phase} popup={!!popupPoint} onHeightChange={setSheetHeight}>
        {content}
      </NavSheet>
      {popup}
      {flash}
    </View>
    </GlassScope>
  );
}

function RoundButton({ label, onPress, children, t, tone, active }: { label: string; onPress: () => void; children: ReactNode; t: SweetTheme; tone: GlassToneName; active?: boolean }) {
  return (
    <SoftPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      style={sweetShadow(t)}>
      <Glass tone={tone} radius={24} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: active ? 2 : 0, borderColor: t.glass[tone].text }}>
        {children}
      </Glass>
    </SoftPressable>
  );
}

/** Yer işareti bu kadar yakından geçen rotada gösterilir (talimatlarda anılan menzil). */
const LANDMARK_NEAR_ROUTE_M = 40;

/**
 * Haritadaki noktalar, rotanın hikâyesine göre süzülür: harita kalabalıklaşmasın.
 * - Anlatım/varış: rota varken yalnız rotadaki numaralı duraklar; rota yoksa hepsi.
 * - Yer işareti: yalnız rotaya yakın olanlar; numaralı durak olan eserinki tekrar çizilmez.
 * - Geliştirici modunda plan aşamasında seçili başlangıç noktası.
 */
function buildMapPoints(points: NavPoint[], starts: StartPoint[], state: NavState, order: Map<string, number>, lang: 'tr' | 'en'): MapPoint[] {
  const out: MapPoint[] = [];
  const fired = new Set(state.fired);
  const name = (p: NavPoint) => p.title[lang] ?? p.title.tr;
  const line = state.plan?.geometry.line;
  const nearRoute = (at: LngLat) => !line || distanceToLineM(at, line) <= LANDMARK_NEAR_ROUTE_M;
  const stopWorks = new Set(points.flatMap((p) => (order.has(p.id) && p.workSlug ? [p.workSlug] : [])));
  for (const p of points) {
    const opens = !!p.body && (p.roles.includes('story') || p.roles.includes('arrival'));
    if (opens) {
      if (p.id === state.plan?.arrival?.id || (line && !order.has(p.id))) continue;
      out.push({ id: p.id, location: p.location, kind: 'story', order: order.get(p.id), label: order.has(p.id) ? name(p) : undefined, done: fired.has(p.id) });
    } else if (p.roles.includes('landmark') && !p.roles.includes('start')) {
      if (!nearRoute(p.location) || (p.workSlug && stopWorks.has(p.workSlug))) continue;
      const typeSlug = p.workSlug ? destinationOf(p.workSlug)?.workType : undefined;
      out.push({ id: p.id, location: p.location, kind: 'landmark', label: name(p), typeSlug });
    }
  }
  if (state.phase === 'plan' && state.start.kind === 'point') {
    const id = state.start.id;
    for (const p of starts) if (p.id === id) out.push({ id: p.id, location: p.location, kind: 'start', label: p.name[lang] ?? p.name.tr, selected: true });
  }
  return out;
}

const makeStyles = (t: SweetTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },
    mapBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm },
    mapTitle: { flex: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.xs },
    pickBanner: { position: 'absolute', alignSelf: 'center', backgroundColor: t.primary.fill, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill, borderCurve: 'continuous' },
    fullBody: { paddingHorizontal: space.xl, gap: space.lg },
  });
