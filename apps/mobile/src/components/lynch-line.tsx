import type { WorkPhoto } from '@sezi/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { useGlassInk } from '@/components/glass';
import { PhotoSourceThumbTag } from '@/components/photo-source';
import { CheckIcon, ChevronIcon, MapIcon, PinIcon, RouteIcon, TurnIcon } from '@/design/icons';
import { outline, SoftPressable } from '@/design/sweet/components';
import { font } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { photoUrl } from '@/lib/works';

export type LynchStopKind = 'stop' | 'landmark' | 'node' | 'district' | 'start' | 'arrival';
export interface LynchStop {
  key: string;
  kind: LynchStopKind;
  title: string;
  subtitle?: string;
  index?: number;
  photo?: WorkPhoto | null;
  done?: boolean;
  onPress?: () => void;
}

/** Durağın sırası ve yerin türü, renk olmadan da okunur. */
export function LynchLine({ stops, compact = false }: { stops: LynchStop[]; compact?: boolean }) {
  const t = useSweetTheme();
  const glassInk = useGlassInk();
  const { t: tr } = useT();
  const borderColor = t.outlined ? t.border : `${(glassInk?.text ?? t.text)}18`;
  return (
    <View>
      {stops.map((stop, position) => {
        const minor = stop.kind === 'landmark' || stop.kind === 'node';
        const isStop = stop.kind === 'stop';
        const label = tr(`lynch.${stop.kind}`);
        const metaLine = [label, stop.subtitle, stop.done ? tr('work.visited') : null].filter(Boolean).join(' · ');
        const badgeBg = stop.done ? t.tones.teal.fill : isStop ? t.gold.fill : t.surface;
        const badgeInk = stop.done ? t.tones.teal.ink : isStop ? t.gold.ink : t.primaryText;
        const badge = stop.done ? (
          <CheckIcon color={badgeInk} size={17} />
        ) : isStop ? (
          <Text style={[s.badgeNumber, { color: badgeInk }]}>{stop.index ?? position + 1}</Text>
        ) : stop.kind === 'landmark' ? (
          <PinIcon color={badgeInk} size={16} />
        ) : stop.kind === 'district' ? (
          <MapIcon color={badgeInk} size={16} />
        ) : stop.kind === 'arrival' ? (
          <TurnIcon turn="straight" arrived color={badgeInk} size={18} />
        ) : (
          <RouteIcon color={badgeInk} size={16} />
        );
        const content = (
          <>
            {!compact && stop.photo ? (
              <View style={s.photo}>
                <Image source={{ uri: photoUrl(stop.photo, 'thumb') }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
                <PhotoSourceThumbTag photo={stop.photo} />
              </View>
            ) : null}
            <View style={s.copy}>
              <Text style={[s.title, minor && s.minorTitle, { color: t.text }]} accessibilityRole={stop.kind === 'district' ? 'header' : undefined}>
                {stop.title}
              </Text>
              <Text style={[s.meta, { color: stop.done ? t.primaryText : t.textMuted }]}>{metaLine}</Text>
            </View>
            {stop.onPress ? <ChevronIcon color={t.textMuted} size={18} /> : null}
          </>
        );
        const cardBg = t.outlined ? t.surface : minor || stop.kind === 'district' ? `${t.soft}B3` : `${t.surface}CC`;
        const cardStyle = [
          s.card,
          { backgroundColor: cardBg, borderColor, paddingVertical: compact || minor ? 8 : 10, paddingHorizontal: 12 },
          outline(t),
        ];
        const accessibilityLabel = [label, stop.index, stop.title, stop.subtitle, stop.done ? tr('work.visited') : null].filter(Boolean).join('. ');
        return (
          <View key={stop.key} style={s.row}>
            <View style={s.rail} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <View
                style={[
                  s.badge,
                  minor && s.minorBadge,
                  { backgroundColor: badgeBg, borderColor: isStop || stop.done ? badgeBg : `${t.primaryText}55` },
                  outline(t),
                ]}>
                {badge}
              </View>
              {position < stops.length - 1 ? <View style={[s.line, { backgroundColor: `${(glassInk?.text ?? t.text)}24` }]} /> : null}
            </View>
            {stop.onPress ? (
              <SoftPressable onPress={stop.onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={cardStyle}>
                {content}
              </SoftPressable>
            ) : (
              <View accessible accessibilityLabel={accessibilityLabel} style={cardStyle}>
                {content}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  rail: { width: 34, alignItems: 'center', paddingTop: 6 },
  badge: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  minorBadge: { width: 28, height: 28, borderRadius: 14, marginVertical: 2 },
  badgeNumber: { fontFamily: font.serif, fontSize: 16, lineHeight: 20 },
  line: { width: 2, flex: 1, minHeight: 10, marginVertical: 4, borderRadius: 1 },
  card: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginBottom: 8,
  },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: font.serif, fontSize: 18, lineHeight: 22 },
  minorTitle: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 19 },
  meta: { fontFamily: font.body, fontSize: 12.5, lineHeight: 16 },
  photo: { width: 52, height: 64, borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' },
});
