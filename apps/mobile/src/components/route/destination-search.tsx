import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Button, Card, Field, ListRow } from '@/components/ui';
import { RouteIcon, SearchIcon } from '@/design/icons';
import { space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { destinationName, searchDestinations } from '@/lib/navigation/destinations';

/**
 * "Nereye?": hedef seçilmeden açılan rota ekranı ya da "Değiştir". En üstte hedefsiz gezinti,
 * altında ada göre süzülen pilot alan eserleri. Seçince plana dönülür.
 */
export function DestinationSearch({ onPick, onCancel }: { onPick: (slug: string | null) => void; onCancel?: () => void }) {
  const t = useSweetTheme();
  const { t: tr, lang } = useT();
  const [query, setQuery] = useState('');
  const results = searchDestinations(query, lang);
  const searching = !!query.trim();

  return (
    <>
      <View style={styles.head}>
        <Text style={[type.title, { color: t.text, flex: 1 }]} accessibilityRole="header">
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
        <Text style={[type.meta, { color: t.textMuted }]} accessibilityLiveRegion="polite">
          {tr('nav.noMatch')}
        </Text>
      ) : (
        <Card padded={false}>
          {searching ? null : (
            <ListRow
              first
              title={tr('nav.strollRow')}
              subtitle={tr('nav.strollRowBody')}
              leading={<RouteIcon color={t.primaryText} size={24} />}
              onPress={() => onPick(null)}
            />
          )}
          {results.map((n, i) => (
            <ListRow key={n.id} first={i === 0 && searching} title={destinationName(n, lang)} onPress={() => onPick(n.workSlug!)} />
          ))}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
