import * as Haptics from 'expo-haptics';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Button, Note } from '@/components/ui';
import { CheckIcon, PlayIcon } from '@/design/icons';
import { outline, SoftPressable } from '@/design/sweet/components';
import { radius, space, type } from '@/design/type';
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
export function PlanPanel({ state, onChangeDest }: { state: NavState; onChangeDest: () => void }) {
  const t = useSweetTheme();
  const { t: tr, lang } = useT();
  const { profile } = useProfile();
  const plan = state.plan;
  const mps = profile ? walkingSpeed(profile) : 1.2;
  const dest = destinationOf(state.dest);
  const title = dest ? destinationName(dest, lang) : tr('nav.stroll');
  const noPermission = state.start.kind === 'here' && (state.permission === 'denied' || state.permission === 'off');
  // Sanal yürüyüş rota ister; GPS yürüyüşü konum gelmeden de başlar (rota konum gelince çizilir).
  const canBegin = state.virtual ? !!plan : !(state.dest && !plan && state.note !== 'need_location');

  return (
    <>
      <View style={{ gap: space.xs }}>
        <View style={styles.titleRow}>
          <Text style={[type.title, { color: t.text, flex: 1 }]} accessibilityRole="header">
            {title}
          </Text>
          <Button variant="ghost" compact label={tr('nav.change')} hint={tr('nav.changeHint')} onPress={onChangeDest} />
        </View>
        {state.tour.length ? <Text style={[type.meta, { color: t.textMuted }]}>{tr('nav.tourLeft', { n: state.tour.length })}</Text> : null}
      </View>

      {state.options.length > 1 ? (
        <OptionCards options={state.options} choice={state.choice} mps={mps} />
      ) : plan ? (
        <RouteFacts plan={plan} mps={mps} />
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
        icon={(c) => <PlayIcon color={c} />}
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
    distance: [formatDistance(plan.route.lengthM, lang), stops ? tr('nav.stops', { n: stops }) : null].filter(Boolean).join(' · '),
    access: plan.stairSegments === 0 ? tr('nav.noStairs') : tr('nav.stairs', { n: plan.stairSegments }),
  };
}

function RouteFacts({ plan, mps }: { plan: PlannedRoute; mps: number }) {
  const t = useSweetTheme();
  const { t: tr, lang } = useT();
  const f = facts(plan, tr, lang);
  const minutes = tr('nav.minutes', { n: minutesFor(plan.route.lengthM, mps) });
  return (
    <View style={styles.facts} accessible accessibilityLabel={[minutes, f.distance, f.access].join(', ')}>
      <Text style={[type.display, { color: t.text }]}>{minutes}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[type.meta, { color: t.text }]}>{f.distance}</Text>
        <Text style={[type.meta, { color: t.textMuted }]}>{f.access}</Text>
      </View>
    </View>
  );
}

/**
 * Seçenek kartları (Google/Yandex haritalardaki gibi): seçili kart dolgulu ve işaretli, diğerleri haritada gri çizgi.
 * Seçim renkle birlikte işaret ve ekran okuyucu durumu taşır.
 */
function OptionCards({ options, choice, mps }: { options: RouteOption[]; choice: NavState['choice']; mps: number }) {
  const t = useSweetTheme();
  const { t: tr, lang } = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll} contentContainerStyle={styles.cards} accessibilityRole="radiogroup" accessibilityLabel={tr('nav.options')}>
      {options.map((o) => {
        const selected = o.choice === choice;
        const ink = selected ? t.primary.ink : t.text;
        const muted = selected ? t.primary.ink : t.textMuted;
        const f = facts(o.plan, tr, lang);
        const minutes = tr('nav.minutes', { n: minutesFor(o.plan.route.lengthM, mps) });
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
              { backgroundColor: selected ? t.primary.fill : t.surface },
              outline(t),
              selected && t.outlined && { borderWidth: 3, borderColor: t.primary.ink },
            ]}>
            <View style={styles.cardHead}>
              <Text style={[type.cardTitle, { color: ink, flex: 1 }]} numberOfLines={1}>
                {optionLabel(o, tr)}
              </Text>
              {selected ? <CheckIcon color={ink} size={18} /> : null}
            </View>
            <Text style={[type.title, { color: ink }]}>{minutes}</Text>
            <Text style={[type.meta, { color: ink }]}>{f.distance}</Text>
            <Text style={[type.meta, { color: muted }]}>{f.access}</Text>
          </SoftPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  facts: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  cardScroll: { marginHorizontal: -space.xl, flexGrow: 0 },
  cards: { gap: space.sm, paddingHorizontal: space.xl },
  card: { width: 176, gap: 2, padding: space.md, borderRadius: radius.lg, borderCurve: 'continuous' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 24 },
});
