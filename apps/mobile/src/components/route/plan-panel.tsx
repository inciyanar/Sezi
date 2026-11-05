import * as Haptics from 'expo-haptics';
import type { NavPoint } from '@sezi/shared';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { useGlassInk } from '@/components/glass';
import { Text } from '@/components/text';
import { Button, Note } from '@/components/ui';
import { CheckIcon, PlayIcon, StopIcon } from '@/design/icons';
import { outline, SoftPressable } from '@/design/sweet/components';
import { font, space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT, type Translate } from '@/lib/i18n';
import { formatDistance, walkingSpeed, type PlannedRoute, type RouteOption } from '@/lib/nav';
import { destinationName, destinationOf, minutesFor } from '@/lib/navigation/destinations';
import { navigation, type NavState } from '@/lib/navigation/session';
import { useProfile } from '@/lib/profile';

/**
 * Plan: hedefin adı, rota seçenekleri ve tek düğme. Ekranın sorusu "hangi yoldan, ne kadar sürer?":
 * en büyük yazı süre. Seçenek yoksa (gezinti, tek rota) aynı bilgi tek satırda.
 */
export function PlanPanel({ state, onChangeDest, points, canHear }: { state: NavState; onChangeDest: () => void; points: NavPoint[]; canHear: boolean }) {
  const t = useSweetTheme();
  const glassInk = useGlassInk();
  const { t: tr, lang } = useT();
  const { profile } = useProfile();
  const plan = state.plan;
  const mps = profile ? walkingSpeed(profile) : 1.2;
  const dest = destinationOf(state.dest);
  const title = dest ? destinationName(dest, lang) : tr('nav.stroll');
  const noPermission = state.start.kind === 'here' && (state.permission === 'denied' || state.permission === 'off');
  // Sanal yürüyüş rota ister; GPS yürüyüşü konum gelmeden de başlar (rota konum gelince çizilir).
  const viaStops = (plan?.via.pointIds ?? []).flatMap((id, index) => {
    const point = points.find((p) => p.id === id);
    return point ? [{ point, order: index + 1, atM: plan?.via.atM[index] }] : [];
  });
  const canBegin = state.virtual ? !!plan : !(state.dest && !plan && state.note !== 'need_location');
  const cardBg = t.outlined ? t.surface : `${t.surface}CC`;
  const borderColor = t.outlined ? t.border : `${(glassInk?.text ?? t.text)}1F`;

  return (
    <>
      <View style={{ gap: 2 }}>
        <View style={styles.titleRow}>
          <Text style={[type.title, { color: glassInk?.text ?? t.text, flex: 1 }]} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <Button variant="ghost" compact label={tr('nav.change')} hint={tr('nav.changeHint')} onPress={onChangeDest} />
        </View>
        {state.tour.length ? <Text style={[type.meta, { color: glassInk?.muted ?? t.textMuted }]}>{tr('nav.tourLeft', { n: state.tour.length })}</Text> : null}
      </View>

      {plan ? <RouteFacts plan={plan} mps={mps} /> : null}
      {state.options.length > 1 ? <OptionCards options={state.options} choice={state.choice} mps={mps} /> : null}
      {viaStops.length > 0 ? (
        <ScrollView
          horizontal={viaStops.length > 1}
          showsHorizontalScrollIndicator={false}
          style={viaStops.length > 1 ? styles.stopScroll : undefined}
          contentContainerStyle={viaStops.length > 1 ? styles.stopCards : undefined}>
          {viaStops.map(({ point, order, atM }) => {
            const playing = state.playing === point.id;
            return (
              <View
                key={point.id}
                style={[
                  styles.next,
                  viaStops.length > 1 && styles.nextMulti,
                  { backgroundColor: cardBg, borderColor },
                  outline(t),
                ]}>
                <View style={[styles.number, { backgroundColor: t.gold.fill }]}>
                  <Text style={[styles.numberText, { color: t.gold.ink }]}>{order}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.stopTitle, { color: t.text }]} numberOfLines={1}>
                    {point.title[lang] ?? point.title.tr}
                  </Text>
                  <Text style={[styles.stopMeta, { color: t.textMuted }]} numberOfLines={1}>
                    {[atM === undefined ? null : tr('nav.minutes', { n: minutesFor(atM, mps) }), point.body ? tr('nav.hasAudio') : null].filter(Boolean).join(' · ')}
                  </Text>
                  {playing && point.body ? <Text style={[type.body, { color: t.text, fontSize: 14, lineHeight: 20 }]}>{point.body[lang] ?? point.body.tr}</Text> : null}
                </View>
                {canHear && point.body ? (
                  <SoftPressable
                    accessibilityRole="button"
                    accessibilityLabel={`${tr(playing ? 'nav.stopAudio' : 'nav.listen')}: ${point.title[lang] ?? point.title.tr}`}
                    hitSlop={5}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      if (playing) navigation.stopAudio();
                      else navigation.playPoint(point.id);
                    }}
                    style={[styles.listen, { backgroundColor: t.primary.fill }]}>
                    {playing ? <StopIcon color={t.primary.ink} size={15} /> : <PlayIcon color={t.primary.ink} size={15} />}
                  </SoftPressable>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {state.note ? <Note text={tr(`nav.note.${state.note}`)} /> : null}
      {noPermission ? (
        <View style={{ gap: space.sm }}>
          <Note text={tr(state.permission === 'off' ? 'nav.servicesOff' : 'nav.denied')} />
          <Button variant="ghost" label={tr('nav.openSettings')} onPress={() => void Linking.openSettings()} />
        </View>
      ) : null}

      <Button
        label={state.virtual ? tr('nav.virtualBegin') : state.dest ? tr('nav.begin') : tr('nav.beginStroll')}
        hint={state.virtual ? tr('nav.virtualHint') : tr('nav.beginHint')}
        disabled={!canBegin}
        arrow
        onPress={() => void navigation.begin()}
      />
    </>
  );
}

const optionLabel = (o: RouteOption, tr: Translate) => tr(`nav.option.${o.choice}`);

/** Rotanın ölçüleri: uzunluk, durak sayısı, basamak durumu (tekerlekli sandalyede her zaman basamaksız). */
function facts(plan: PlannedRoute, tr: Translate, lang: 'tr' | 'en') {
  const stops = plan.via.pointIds.length;
  return {
    distance: [formatDistance(plan.route.lengthM, lang), tr('nav.stops', { n: stops })].join(' · '),
    access: plan.stairSegments === 0 ? tr('nav.noStairs') : tr('nav.stairs', { n: plan.stairSegments }),
  };
}

function RouteFacts({ plan, mps }: { plan: PlannedRoute; mps: number }) {
  const t = useSweetTheme();
  const glassInk = useGlassInk();
  const { t: tr, lang } = useT();
  const f = facts(plan, tr, lang);
  const minutes = tr('nav.minutes', { n: minutesFor(plan.route.lengthM, mps) });
  return (
    <View style={styles.facts} accessible accessibilityLabel={[minutes, f.distance, f.access].join(', ')}>
      <Text style={[styles.heroMinutes, { color: glassInk?.text ?? t.text }]}>{minutes}</Text>
      <Text style={[styles.factsMeta, { color: glassInk?.muted ?? t.textMuted }]} numberOfLines={1}>
        {[f.distance, f.access].join(' · ')}
      </Text>
    </View>
  );
}

/**
 * Seçenek kartları: Hikâyeli / En kısa / Basamaksız alternatiflerini kompakt iki satırlı hap olarak sunar;
 * altındaki durak kartını ve "Yürüyüşe başla" düğmesini ekran dışına itmez.
 */
function OptionCards({ options, choice, mps }: { options: RouteOption[]; choice: NavState['choice']; mps: number }) {
  const t = useSweetTheme();
  const glassInk = useGlassInk();
  const { t: tr, lang } = useT();
  const cardBg = t.outlined ? t.surface : `${t.surface}B3`;
  const borderColor = t.outlined ? t.border : `${(glassInk?.text ?? t.text)}22`;
  return (
    <View style={styles.cards} accessibilityRole="radiogroup" accessibilityLabel={tr('nav.options')}>
      {options.map((o) => {
        const selected = o.choice === choice;
        const ink = selected ? t.primary.ink : t.text;
        const muted = selected ? `${t.primary.ink}CC` : t.textMuted;
        const f = facts(o.plan, tr, lang);
        const minutes = tr('nav.minutes', { n: minutesFor(o.plan.route.lengthM, mps) });
        const stops = o.plan.via.pointIds.length;
        const sub = [minutes, stops > 0 ? tr('nav.stops', { n: stops }) : formatDistance(o.plan.route.lengthM, lang), o.plan.stairSegments === 0 ? tr('nav.noStairs') : null]
          .filter(Boolean)
          .join(' · ');
        return (
          <SoftPressable
            key={o.choice}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              navigation.choose(o.choice);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={[optionLabel(o, tr), minutes, f.distance, f.access].join(', ')}
            style={[
              styles.card,
              { backgroundColor: selected ? t.primary.fill : cardBg, borderColor: selected ? t.primary.fill : borderColor },
              outline(t),
              selected && t.outlined && { borderWidth: 3, borderColor: t.primary.ink },
            ]}>
            <View style={styles.cardHead}>
              <Text style={[styles.optionTitle, { color: ink, flex: 1 }]} numberOfLines={1}>
                {optionLabel(o, tr)}
              </Text>
              {selected ? <CheckIcon color={ink} size={15} /> : null}
            </View>
            <Text style={[styles.optionSub, { color: muted }]} numberOfLines={1}>
              {sub}
            </Text>
          </SoftPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  facts: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  heroMinutes: { fontFamily: font.serif, fontSize: 40, lineHeight: 42, letterSpacing: -1.2 },
  factsMeta: { fontFamily: font.body, fontSize: 13.5, lineHeight: 18, flex: 1 },
  cards: { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1,
    minHeight: 54,
    gap: 2,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: 'center',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  optionTitle: { fontFamily: font.bodyBold, fontSize: 13.5, lineHeight: 17 },
  optionSub: { fontFamily: font.body, fontSize: 12, lineHeight: 15 },
  stopScroll: { marginHorizontal: -16, flexGrow: 0 },
  stopCards: { gap: 8, paddingHorizontal: 16 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  nextMulti: { width: 268 },
  number: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontFamily: font.serif, fontSize: 16, lineHeight: 20 },
  stopTitle: { fontFamily: font.serif, fontSize: 18, lineHeight: 22 },
  stopMeta: { fontFamily: font.body, fontSize: 12.5, lineHeight: 16 },
  listen: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
