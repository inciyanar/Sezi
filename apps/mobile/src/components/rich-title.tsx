import { plainTitle, splitAccent } from '@sezi/shared';
import type { StyleProp, TextStyle } from 'react-native';

import { useGlassInk } from '@/components/glass';
import { Text } from '@/components/text';
import { font, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';

/**
 * Vurgulu başlık: metindeki `_…_` parçası italik Fraunces ve vurgu rengiyle yazılır (metinde en çok bir vurgu).
 * Vurgu düz zeminde ve açık camda `primaryText`, fotoğraf ya da koyu cam üstünde altın (`onPhoto.accent`).
 * Ekran okuyucu `_` işaretlerini duymaz; başlık rolü taşır.
 */
export function RichTitle({ text, style, onPhoto }: { text: string; style?: StyleProp<TextStyle>; onPhoto?: boolean }) {
  const t = useSweetTheme();
  const ink = useGlassInk();
  const [before, accent, after] = splitAccent(text);
  const dark = onPhoto ?? ink?.tone === 'dark';
  const color = ink?.text ?? (dark ? t.onPhoto.text : t.text);
  return (
    <Text style={[type.title, { color }, style]} accessibilityRole="header" accessibilityLabel={plainTitle(text)}>
      {before}
      {accent ? <Text style={{ fontFamily: font.serifItalic, color: dark ? t.onPhoto.accent : t.primaryText }}>{accent}</Text> : null}
      {after}
    </Text>
  );
}
