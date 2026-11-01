import type { ComponentProps, ComponentRef, Ref } from 'react';
import { StyleSheet, Text as NativeText } from 'react-native';

import { TEXT_SCALE, useSettings } from '@/lib/settings';

/** Yazının ref tipi (odak taşıma için). */
export type TextRef = ComponentRef<typeof NativeText>;

/**
 * Uygulamanın yazısı: Ayarlar → "Yazı boyutu" ile büyür, sistem yazı boyutunun üstüne eklenir.
 * Ekranlar `react-native` Text yerine bunu kullanır. Boyutu açıkça verilmeyen iç içe yazı, büyümüş üst yazıdan miras alır.
 */
export function Text(props: ComponentProps<typeof NativeText> & { ref?: Ref<TextRef> }) {
  const { settings } = useSettings();
  const scale = TEXT_SCALE[settings.textScale];
  if (scale === 1) return <NativeText {...props} />;
  const { fontSize, lineHeight } = StyleSheet.flatten(props.style) ?? {};
  const scaled = {
    ...(fontSize ? { fontSize: fontSize * scale } : null),
    ...(lineHeight ? { lineHeight: lineHeight * scale } : null),
  };
  return <NativeText {...props} style={[props.style, scaled]} />;
}
