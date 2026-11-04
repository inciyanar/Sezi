import { ScrollView, View } from 'react-native';
import { Text } from '@/components/text';

import { AchievementGrid, sortAchievements } from '@/components/social-grids';
import { Card, SectionTitle } from '@/components/ui';
import { space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useAchievements } from '@/lib/achievements';
import { useT } from '@/lib/i18n';

/** Başarımlar: kazanılanlar ve sıradakiler; kutucuğa dokununca ayrıntı paneli. */
export default function AchievementsScreen() {
  const t = useSweetTheme();
  const { t: tr } = useT();
  const { list } = useAchievements();
  const { earned, locked } = sortAchievements(list);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentContainerStyle={{ padding: space.xl, gap: space.xl, paddingBottom: space.xxl }}>
      <View style={{ gap: space.lg }}>
        <SectionTitle
          title={tr('ach.earned')}
          action={<Text style={[type.meta, { color: t.textMuted }]}>{`${earned.length}/${list.length}`}</Text>}
        />
        {earned.length ? (
          <AchievementGrid list={earned} />
        ) : (
          <Card>
            <Text style={[type.body, { color: t.textMuted }]}>{tr('ach.noneEarned')}</Text>
          </Card>
        )}
      </View>
      {locked.length ? (
        <View style={{ gap: space.lg }}>
          <SectionTitle
            title={tr('ach.next')}
            action={<Text style={[type.meta, { color: t.textMuted }]}>{String(locked.length)}</Text>}
          />
          <AchievementGrid list={locked} />
        </View>
      ) : null}
    </ScrollView>
  );
}
