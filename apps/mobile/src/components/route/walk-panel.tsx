import type { NavPoint } from '@sezi/shared';
import { StyleSheet, View } from 'react-native';

import { useGlassInk } from '@/components/glass';
import { NavAlertBanner } from '@/components/nav-alert';
import { SoundCaptions } from '@/components/sound-captions';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui';
import { TurnIcon } from '@/design/icons';
import { FadeInItem, outline, SoftPressable } from '@/design/sweet/components';
import { font, radius, space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { formatDistance } from '@/lib/nav';
import { minutesFor } from '@/lib/navigation/destinations';
import { navigation, type NavState } from '@/lib/navigation/session';

/**
 * Yürüyüş: ekranın sorusu "şimdi ne yapmalıyım?". En büyük öğe talimat kartı; dokununca talimat yeniden okunur
 * (ayrı Tekrarla düğmesi yok). Altında "sonra" satırı, ince ilerleme, sıradaki anlatım noktası.
 * `large`: görmeyen profilde harita yok, talimat ekranı kaplar.
 */
export function WalkPanel({
  state,
  points,
  order,
  canHear,
  hearing,
  mps,
  large,
}: {
  state: NavState;
  points: NavPoint[];
  order: Map<string, number>;
  canHear: boolean;
  hearing: string;
  mps: number;
  large: boolean;
}) {
  const t = useSweetTheme();
  const glassInk = useGlassInk();
  const { t: tr, lang } = useT();
  const plan = state.plan;
  const current = plan && state.stepIndex >= 0 ? plan.steps[state.stepIndex] : undefined;
  const nextStep = plan?.steps[state.stepIndex + 1];
  const total = plan ? plan.geometry.nodeAtM.at(-1)! : 0;
  const left = Math.max(0, Math.round(total - state.distance));
  const toNext = nextStep ? Math.max(0, Math.round(nextStep.atM - state.distance)) : null;
  const progress = total > 0 ? Math.min(100, Math.round((state.distance / total) * 100)) : 0;
  const nextVia = plan?.via.pointIds.find((id) => !state.fired.includes(id));
  const nextViaPoint = nextVia ? points.find((p) => p.id === nextVia) : undefined;
  const headline = plan ? (current?.text ?? tr('nav.ready')) : state.fix ? tr('nav.freeWalk') : tr('nav.waiting');
  const sub = plan ? (toNext !== null ? tr('nav.nextIn', { d: formatDistance(toNext, lang) }) : null) : tr('nav.freeWalkHint');
  const cardBg = t.outlined ? t.surface : `${t.surface}CC`;
  const borderColor = t.outlined ? t.border : `${(glassInk?.text ?? t.text)}1F`;

  return (
    <>
      {state.source === 'sim' ? <Badge label={tr('nav.simBadge')} tone="primary" /> : null}
      <NavAlertBanner alert={state.alert} onDismiss={navigation.dismissAlert} />

      {/* Talimat: yalnız yürüyüş başlarken bir kez girer; adım değişimini CueFlash gösterir, ekran okuyucu duyurur. */}
      <FadeInItem index={0}>
        <SoftPressable
          onPress={navigation.repeat}
          disabled={state.stepIndex < 0}
          feedback="scaleLarge"
          accessibilityRole="button"
          accessibilityLabel={[headline, sub].filter(Boolean).join('. ')}
          accessibilityHint={state.stepIndex >= 0 ? tr('nav.repeatHint') : undefined}
          accessibilityLiveRegion="polite"
          style={[styles.instruction, large && styles.instructionLarge, { backgroundColor: t.primary.fill }, outline(t)]}>
          <View style={[styles.turnBadge, large && styles.turnBadgeLarge, { backgroundColor: `${t.primary.ink}18` }]}>
            <TurnIcon turn={current?.turn ?? 'straight'} arrived={false} color={t.primary.ink} size={large ? 48 : 28} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            {sub ? <Text style={[large ? type.lead : styles.stepSub, { color: `${t.primary.ink}CC` }]}>{sub}</Text> : null}
            <Text style={[large ? type.display : styles.stepHeadline, { color: t.primary.ink }]}>{headline}</Text>
          </View>
        </SoftPressable>
      </FadeInItem>

      {nextStep && state.stepIndex >= 0 ? (
        <View style={[styles.thenCard, { backgroundColor: cardBg, borderColor }, outline(t)]}>
          <View style={[styles.thenIcon, { backgroundColor: `${(glassInk?.text ?? t.text)}12` }]}>
            <TurnIcon turn={nextStep.turn} arrived={false} color={t.textMuted} size={18} />
          </View>
          <Text style={[large ? type.lead : styles.thenText, { color: t.text, flex: 1 }]} numberOfLines={2}>
            <Text style={{ color: t.textMuted }}>{tr('nav.then')}: </Text>
            {nextStep.text}
          </Text>
        </View>
      ) : null}

      {plan ? (
        <View style={styles.progressRow}>
          <View
            style={[styles.track, { backgroundColor: `${(glassInk?.text ?? t.text)}1F` }, outline(t)]}
            accessibilityRole="progressbar"
            accessibilityLabel={tr('nav.progress', { done: Math.round(state.distance), total: Math.round(total) })}
            accessibilityValue={{ min: 0, max: 100, now: progress }}>
            <View style={{ width: `${progress}%`, height: '100%', backgroundColor: t.primaryText, borderRadius: radius.pill }} />
          </View>
          <Text style={[styles.remainingText, { color: glassInk?.muted ?? t.textMuted }]}>
            {tr('nav.remaining', { d: formatDistance(left, lang), min: minutesFor(left, mps) })}
          </Text>
        </View>
      ) : null}

      {nextViaPoint ? (
        <View
          style={[styles.nextVia, { backgroundColor: cardBg, borderColor }, outline(t)]}
          accessible
          accessibilityLabel={tr('nav.nextVia', { n: order.get(nextViaPoint.id) ?? '', name: nextViaPoint.title[lang] ?? nextViaPoint.title.tr })}>
          <View style={[styles.num, { backgroundColor: t.gold.fill }]}>
            <Text style={[styles.numText, { color: t.gold.ink }]}>{order.get(nextViaPoint.id)}</Text>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[styles.viaTitle, { color: t.text }]} numberOfLines={1}>
              {nextViaPoint.title[lang] ?? nextViaPoint.title.tr}
            </Text>
            <Text style={[styles.viaMeta, { color: t.textMuted }]} numberOfLines={1}>
              {nextViaPoint.body ? tr('nav.hasAudio') : tr('nav.point')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Duyamayan kullanıcı ve kalabalıkta ses manzarasının yazılı karşılığı. */}
      {hearing !== 'full' || state.noisy ? <SoundCaptions sounds={state.sounds} muted={!canHear || state.noisy} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderCurve: 'continuous',
    minHeight: 84,
  },
  instructionLarge: { padding: space.xl, minHeight: 200 },
  turnBadge: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  turnBadgeLarge: { width: 72, height: 72, borderRadius: 24 },
  stepHeadline: { fontFamily: font.serif, fontSize: 20, lineHeight: 25 },
  stepSub: { fontFamily: font.bodyBold, fontSize: 12.5, lineHeight: 16 },
  thenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  thenIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  thenText: { fontFamily: font.body, fontSize: 13.5, lineHeight: 18 },
  progressRow: { gap: 6 },
  track: { height: 6, borderRadius: radius.pill, borderCurve: 'continuous', overflow: 'hidden' },
  remainingText: { fontFamily: font.bodyBold, fontSize: 12.5, lineHeight: 16 },
  nextVia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    minHeight: 54,
  },
  num: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: font.serif, fontSize: 16, lineHeight: 20 },
  viaTitle: { fontFamily: font.serif, fontSize: 18, lineHeight: 22 },
  viaMeta: { fontFamily: font.body, fontSize: 12.5, lineHeight: 16 },
});
