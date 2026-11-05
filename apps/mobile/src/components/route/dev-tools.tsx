import type { NavPoint } from '@sezi/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useGlassInk } from '@/components/glass';
import { LynchLine, type LynchStop } from '@/components/lynch-line';
import { ScenarioPanel } from '@/components/scenario-panel';
import { Text } from '@/components/text';
import { Button, Chip, Eyebrow, Segmented } from '@/components/ui';
import { MapIcon, PinIcon, PlayIcon, StopIcon } from '@/design/icons';
import { space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import type { PlannedRoute, StartPoint } from '@/lib/nav';
import { navigation, type NavState } from '@/lib/navigation/session';

/**
 * Geliştirici modu (Ayarlar → Geliştirici simülasyonu) araçları; normal kullanıcı görmez.
 * Plan: başlangıç seçimi (konum, haritada seçme, başlangıç noktaları), profil karşılaştırma, ayrıntılı durak hattı.
 */
export function DevPlanTools({
  state,
  starts,
  points,
  order,
  picking,
  setPicking,
}: {
  state: NavState;
  starts: StartPoint[];
  points: NavPoint[];
  order: Map<string, number>;
  picking: boolean;
  setPicking: (v: boolean) => void;
}) {
  const t = useSweetTheme();
  const glassInk = useGlassInk();
  const { t: tr, lang } = useT();
  const plan = state.plan;
  // Konum pilot alan dışındaysa rota varsayılan başlangıçtan (ilk başlangıç noktası) çizilir.
  const startTitle =
    state.start.kind === 'here'
      ? state.virtual
        ? (starts[0]?.name[lang] ?? starts[0]?.name.tr ?? tr('nav.here'))
        : tr('nav.here')
      : state.start.kind === 'pick'
        ? tr('nav.picked')
        : (starts.find((p) => state.start.kind === 'point' && p.id === state.start.id)?.name[lang] ?? tr('nav.from'));
  return (
    <View style={styles.block}>
      <Text style={[type.heading, { color: glassInk?.text ?? t.text }]} accessibilityRole="header">
        {tr('nav.devTools')}
      </Text>
      <View style={{ gap: space.sm }}>
        <Eyebrow text={tr('nav.from')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
          <Chip label={tr('nav.here')} selected={state.start.kind === 'here'} onPress={() => navigation.setStart({ kind: 'here' })} icon={(c) => <PinIcon color={c} size={18} />} />
          <Chip label={state.start.kind === 'pick' ? tr('nav.picked') : tr('nav.pickOnMap')} selected={state.start.kind === 'pick' || picking} onPress={() => setPicking(!picking)} icon={(c) => <MapIcon color={c} size={18} />} />
          {starts.map((p) => (
            <Chip key={p.id} label={p.name[lang] ?? p.name.tr} selected={state.start.kind === 'point' && state.start.id === p.id} onPress={() => navigation.setStart({ kind: 'point', id: p.id })} />
          ))}
        </ScrollView>
      </View>
      {state.dest ? <Button variant="outline" label={tr('nav.compare')} onPress={() => router.push({ pathname: '/compare/[slug]', params: { slug: state.dest! } })} /> : null}
      {plan ? <ViaList plan={plan} points={points} order={order} fired={state.fired} startTitle={startTitle} /> : null}
    </View>
  );
}

/** Yürüyüş: sanal yürüyüşte duraklatma, hız ve jüri senaryoları. */
export function DevWalkTools({ state }: { state: NavState }) {
  const t = useSweetTheme();
  const glassInk = useGlassInk();
  const { t: tr } = useT();
  return (
    <View style={styles.block}>
      <Text style={[type.heading, { color: glassInk?.text ?? t.text }]} accessibilityRole="header">
        {tr('nav.devTools')}
      </Text>
      <Button
        variant="outline"
        label={state.running ? tr('nav.pause') : tr('nav.resume')}
        onPress={state.running ? navigation.pause : navigation.resume}
        icon={(c) => (state.running ? <StopIcon color={c} /> : <PlayIcon color={c} />)}
      />
      <Segmented label={tr('nav.speed')} value={state.speed} onChange={navigation.setSpeed} options={[1, 3, 8].map((v) => ({ value: v, label: `${v}×` }))} />
      <ScenarioPanel state={state} onBlock={navigation.blockAhead} onWrongTurn={navigation.wrongTurn} onCrowd={navigation.toggleCrowd} />
    </View>
  );
}

/** Yer işaretleri ve anlatım durakları rota üzerindeki gerçek mesafeye göre sıralanır. */
function ViaList({ plan, points, order, fired, startTitle }: { plan: PlannedRoute; points: NavPoint[]; order: Map<string, number>; fired: string[]; startTitle: string }) {
  const { t: tr, lang } = useT();
  const items: { atM: number; stop: LynchStop }[] = [];
  const viaPoints = plan.via.pointIds.flatMap((id) => points.filter((p) => p.id === id));
  for (const landmark of plan.passedLandmarks) {
    if (landmark.pointId && plan.via.pointIds.includes(landmark.pointId)) continue;
    // Aynı eser hem yer işareti hem anlatım durağıysa bir kez, durak olarak görünür.
    if (landmark.workSlug && viaPoints.some((p) => p.workSlug === landmark.workSlug)) continue;
    const index = plan.route.nodeIds.indexOf(landmark.id);
    items.push({
      atM: plan.geometry.nodeAtM[index] ?? 0,
      stop: { key: `landmark:${landmark.id}`, kind: 'landmark', title: landmark.name?.[lang] ?? landmark.name?.tr ?? tr('lynch.landmark') },
    });
  }
  plan.via.pointIds.forEach((id, index) => {
    const point = points.find((p) => p.id === id);
    if (!point) return;
    items.push({
      atM: plan.via.atM[index] ?? 0,
      stop: {
        key: `story:${id}`,
        kind: 'stop',
        title: point.title[lang] ?? point.title.tr,
        subtitle: point.audio.tr || point.audio.en ? tr('nav.hasAudio') : tr('nav.point'),
        index: order.get(id),
        done: fired.includes(id),
      },
    });
  });
  items.sort((a, b) => a.atM - b.atM);
  const stops: LynchStop[] = [
    { key: 'start', kind: 'start', title: startTitle },
    ...items.map((item) => item.stop),
    { key: 'arrival', kind: 'arrival', title: plan.end.name?.[lang] ?? plan.end.name?.tr ?? tr('nav.stroll') },
  ];
  return (
    <View style={{ gap: space.sm }}>
      <Eyebrow text={tr('nav.onTheWay')} />
      <LynchLine stops={stops} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md, paddingTop: space.lg },
  chips: { gap: space.sm, paddingHorizontal: space.xl },
  chipScroll: { marginHorizontal: -space.xl },
});
