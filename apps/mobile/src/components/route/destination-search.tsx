import { toneForType } from '@sezi/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useGlassInk } from '@/components/glass';
import { Text } from '@/components/text';
import { Button, Field } from '@/components/ui';
import { ChevronIcon, RouteIcon, SearchIcon } from '@/design/icons';
import { outline, SoftPressable } from '@/design/sweet/components';
import { font, space, type } from '@/design/type';
import { WorkGlyphInline } from '@/design/work-glyph';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { destinationName, searchDestinations } from '@/lib/navigation/destinations';

/**
 * "Nereye?": hedef seçilmeden açılan rota ekranı ya da "Değiştir". En üstte hedefsiz gezinti,
 * altında ada göre süzülen pilot alan eserleri (haritadaki tür simgeleriyle eşleşen kartlar).
 */
export function DestinationSearch({ onPick, onCancel }: { onPick: (slug: string | null) => void; onCancel?: () => void }) {
  const t = useSweetTheme();
  const glassInk = useGlassInk();
  const { t: tr, lang } = useT();
  const [query, setQuery] = useState('');
  const results = searchDestinations(query, lang);
  const searching = !!query.trim();
  const cardBg = t.outlined ? t.surface : `${t.surface}CC`;
  const borderColor = t.outlined ? t.border : `${(glassInk?.text ?? t.text)}18`;

  return (
    <>
      <View style={styles.head}>
        <Text style={[type.title, { color: glassInk?.text ?? t.text, flex: 1 }]} accessibilityRole="header">
          {tr('nav.whereTo')}
        </Text>
        {onCancel ? <Button variant="ghost" compact label={tr('nav.cancel')} onPress={onCancel} /> : null}
      </View>
      <Field
        label={tr('nav.searchLabel')}
        placeholder={tr('nav.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        icon={(c) => <SearchIcon color={c} />}
        autoCorrect={false}
        returnKeyType="search"
      />
      {searching && results.length === 0 ? (
        <Text style={[type.meta, { color: glassInk?.muted ?? t.textMuted }]} accessibilityLiveRegion="polite">
          {tr('nav.noMatch')}
        </Text>
      ) : (
        <View style={styles.list}>
          {searching ? null : (
            <SoftPressable
              onPress={() => onPick(null)}
              accessibilityRole="button"
              accessibilityLabel={`${tr('nav.strollRow')}. ${tr('nav.strollRowBody')}`}
              style={[styles.item, { backgroundColor: cardBg, borderColor }, outline(t)]}>
              <View style={[styles.iconBubble, { backgroundColor: t.gold.fill }]}>
                <RouteIcon color={t.gold.ink} size={20} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.itemTitle, { color: t.text }]}>{tr('nav.strollRow')}</Text>
                <Text style={[styles.itemSub, { color: t.textMuted }]}>{tr('nav.strollRowBody')}</Text>
              </View>
              <ChevronIcon color={t.textMuted} size={18} />
            </SoftPressable>
          )}
          {results.map((n) => {
            const slug = n.workType ?? 'cami';
            const tone = t.tones[toneForType(slug)];
            const label = destinationName(n, lang);
            return (
              <SoftPressable
                key={n.id}
                onPress={() => onPick(n.workSlug!)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={[styles.item, { backgroundColor: cardBg, borderColor }, outline(t)]}>
                <View style={[styles.iconBubble, { backgroundColor: tone.fill }]}>
                  <WorkGlyphInline slug={slug} color={tone.ink} size={18} />
                </View>
                <Text style={[styles.itemTitle, { color: t.text, flex: 1 }]} numberOfLines={1}>
                  {label}
                </Text>
                <ChevronIcon color={t.textMuted} size={18} />
              </SoftPressable>
            );
          })}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  list: { gap: space.sm },
  item: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  iconBubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: font.serif, fontSize: 18, lineHeight: 22 },
  itemSub: { fontFamily: font.body, fontSize: 12.5, lineHeight: 16 },
});
