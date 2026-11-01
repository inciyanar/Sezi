import type { NavPoint } from '@sezi/shared';
import { StyleSheet, View } from 'react-native';

import { NavAlertBanner } from '@/components/nav-alert';
import { SoundCaptions } from '@/components/sound-captions';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui';
import { TurnIcon } from '@/design/icons';
import { FadeInItem, outline, SoftPressable } from '@/design/sweet/components';
import { radius, space, type } from '@/design/type';
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
  const headStyle = large ? type.display : { ...type.display, fontSize: 22, lineHeight: 28 };

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
          <TurnIcon turn={current?.turn ?? 'straight'} arrived={false} color={t.primary.ink} size={large ? 64 : 44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[headStyle, { color: t.primary.ink }]}>{headline}</Text>
            {sub ? <Text style={[large ? type.lead : type.meta, { color: t.primary.ink }]}>{sub}</Text> : null}
          </View>
        </SoftPressable>
      </FadeInItem>

      {nextStep && state.stepIndex >= 0 ? (
        <Text style={[large ? type.lead : type.body, { color: t.textMuted }]} numberOfLines={2}>
          {tr('nav.then')}: {nextStep.text}
        </Text>
      ) : null}

      {plan ? (
        <View style={styles.progressRow}>
          <View
            style={[styles.track, { backgroundColor: t.soft }, outline(t)]}
            accessibilityRole="progressbar"
            accessibilityLabel={tr('nav.progress', { done: Math.round(state.distance), total: Math.round(total) })}
            accessibilityValue={{ min: 0, max: 100, now: progress }}>
            <View style={{ width: `${progress}%`, height: '100%', backgroundColor: t.primaryText, borderRadius: radius.pill }} />
          </View>
          <Text style={[type.meta, { color: t.text }]}>{tr('nav.remaining', { d: formatDistance(left, lang), min: minutesFor(left, mps) })}</Text>
        </View>
      ) : null}

      {nextViaPoint ? (
        <View style={styles.nextVia} accessible accessibilityLabel={tr('nav.nextVia', { n: order.get(nextViaPoint.id) ?? '', name: nextViaPoint.title[lang] ?? nextViaPoint.title.tr })}>
          <View style={[styles.num, { backgroundColor: t.accent.fill }, outline(t)]}>
            <Text style={[type.meta, { color: t.accent.ink, fontFamily: type.button.fontFamily }]}>{order.get(nextViaPoint.id)}</Text>
          </View>
          <Text style={[type.body, { color: t.text, flex: 1 }]} numberOfLines={1}>
            {nextViaPoint.title[lang] ?? nextViaPoint.title.tr}
          </Text>
        </View>
      ) : null}

      {/* Duyamayan kullanıcı ve kalabalıkta ses manzarasının yazılı karşılığı. */}
      {hearing !== 'full' || state.noisy ? <SoundCaptions sounds={state.sounds} muted={!canHear || state.noisy} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  instruction: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.xl, borderCurve: 'continuous', minHeight: 96 },
  instructionLarge: { padding: space.xl, minHeight: 200 },
  progressRow: { gap: space.xs },
  track: { height: 6, borderRadius: radius.pill, borderCurve: 'continuous', overflow: 'hidden' },
  nextVia: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
