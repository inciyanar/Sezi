import { StyleSheet, View } from 'react-native';

import { useGlassInk } from '@/components/glass';
import { Text } from '@/components/text';
import { Card, Segmented, ToggleRow } from '@/components/ui';
import { space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';

/**
 * Görme ile ilgili görünüm ayarları: yüksek kontrast, yazı boyutu, renk körlüğü, hareket (Ayarlar ekranı).
 * Değişiklik hemen uygulanır (önizleme ayrı değil). Cam içinde (`useGlassInk`) ek kart sarmalayıcısı açmaz.
 */
export function VisionSettings({ first = true }: { first?: boolean }) {
  const t = useSweetTheme();
  const ink = useGlassInk();
  const { t: tr } = useT();
  const { settings, update } = useSettings();
  const divider = t.outlined ? t.border : ink ? `${ink.text}1F` : t.border;

  const content = (
    <>
      <ToggleRow first={first} title={tr('vision.contrast')} subtitle={tr('vision.contrast.d')} value={settings.highContrast} onChange={(v) => update({ highContrast: v })} />
      <View style={[styles.block, { borderTopWidth: t.outlined ? 1 : StyleSheet.hairlineWidth, borderTopColor: divider }]}>
        <Text style={[type.itemTitle, { color: ink?.text ?? t.text }]}>{tr('vision.textSize')}</Text>
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
    </>
  );
  if (ink) return content;
  return <Card padded={false}>{content}</Card>;
}

const styles = StyleSheet.create({
  block: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
});
