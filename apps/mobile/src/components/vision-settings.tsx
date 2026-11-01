import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Card, Segmented, ToggleRow } from '@/components/ui';
import { space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT, type MessageKey } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';

/**
 * Görme ile ilgili görünüm ayarları: yüksek kontrast, yazı boyutu, renk körlüğü, hareket.
 * Onboarding'de "Az görüyorum" seçilince seçeneklerin altında, Ayarlar'da herkes için görünür.
 * Değişiklik hemen uygulanır (önizleme ayrı değil). `tr`: onboarding henüz kaydedilmemiş dili verir.
 */
export function VisionSettings({ tr: given }: { tr?: (key: MessageKey) => string }) {
  const t = useSweetTheme();
  const { t: saved } = useT();
  const tr = given ?? saved;
  const { settings, update } = useSettings();

  return (
    <Card padded={false}>
      <ToggleRow first title={tr('vision.contrast')} subtitle={tr('vision.contrast.d')} value={settings.highContrast} onChange={(v) => update({ highContrast: v })} />
      <View style={[styles.block, { borderTopWidth: t.outlined ? 1 : StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
        <Text style={[type.itemTitle, { color: t.text }]}>{tr('vision.textSize')}</Text>
        <Segmented
          label={tr('vision.textSize')}
          value={settings.textScale}
          onChange={(v) => update({ textScale: v })}
          options={[
            { value: 'normal', label: tr('vision.textSize.normal') },
            { value: 'large', label: tr('vision.textSize.large') },
            { value: 'xlarge', label: tr('vision.textSize.xlarge') },
          ]}
        />
      </View>
      <ToggleRow
        title={tr('vision.colorSafe')}
        subtitle={settings.highContrast ? tr('vision.colorSafe.contrast') : tr('vision.colorSafe.d')}
        value={settings.colorSafe}
        onChange={(v) => update({ colorSafe: v })}
      />
      <ToggleRow title={tr('vision.motion')} subtitle={tr('vision.motion.d')} value={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
    </Card>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
});
