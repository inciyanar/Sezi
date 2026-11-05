import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { RichTitle } from '@/components/rich-title';
import { BackIcon } from '@/design/icons';
import { outline, SoftPressable } from '@/design/sweet/components';
import { radius, space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';

/**
 * Başlık tek hiyerarşi taşır; yinelenen üst etiket ve dekoratif şerit yok. Başlık `_…_` vurgusu taşıyabilir.
 * `onBack` verilirse (yığın ekranı) solda 48 dp geri dairesi çizilir.
 */
export function ScreenHeader({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: ReactNode; onBack?: () => void }) {
  const t = useSweetTheme();
  const { t: tr } = useT();
  return (
    <View style={styles.wrap}>
      {onBack ? (
        <SoftPressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={tr('common.back')}
          style={[styles.back, { backgroundColor: t.soft }, outline(t)]}>
          <BackIcon color={t.text} />
        </SoftPressable>
      ) : null}
      <View style={styles.row}>
        <RichTitle text={title} style={[type.screenTitle, { flex: 1 }]} />
        {action}
      </View>
      {subtitle ? <Text style={[type.body, { color: t.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, paddingTop: space.lg, paddingBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
});
