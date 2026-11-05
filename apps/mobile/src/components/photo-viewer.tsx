import { loc, type WorkPhoto } from '@sezi/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/design/icons';
import { formatPhotoCredit, PhotoSourceTag } from '@/components/photo-source';
import { space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { photoUrl } from '@/lib/works';

/**
 * Tam ekran fotoğraf görüntüleyici: yatay kaydırma, alt metin ve telif satırı.
 * Zemin her temada koyudur (fotoğrafın kendisi öne çıksın); metinler beyaz.
 */
export function PhotoViewer({ photos, start, onClose }: { photos: WorkPhoto[]; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const t = useSweetTheme();
  const insets = useSafeAreaInsets();
  const { t: tr, lang } = useT();
  const [index, setIndex] = useState(start ?? 0);
  const [captionH, setCaptionH] = useState(0);
  const current = photos[index];
  const credit = current ? formatPhotoCredit(current, lang) : null;

  return (
    <Modal visible={start !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.screen, { backgroundColor: t.glass.dark.tint }]}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          initialScrollIndex={start ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(p) => p.id}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Image
              source={{ uri: photoUrl(item, 'full') }}
              placeholder={{ uri: photoUrl(item, 'thumb') }}
              style={{ width, height }}
              contentFit="contain"
              accessible
              accessibilityLabel={loc(item.alt, lang)}
            />
          )}
        />
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={tr('work.viewerClose')}
          style={[styles.close, { top: insets.top + space.sm, backgroundColor: t.glass.dark.tint }]}>
          <CloseIcon color={t.glass.dark.text} />
        </Pressable>
        {current ? (
          <>
            <PhotoSourceTag
              photo={current}
              style={{ bottom: (captionH || insets.bottom + 80) + space.sm, right: space.lg }}
            />
            <View
              onLayout={(e) => setCaptionH(e.nativeEvent.layout.height)}
              style={[styles.caption, { paddingBottom: insets.bottom + space.lg, backgroundColor: t.glass.dark.tint }]}
              accessibilityLiveRegion="polite">
              <Text style={[type.body, { color: t.glass.dark.text }]}>{loc(current.alt, lang)}</Text>
              <Text style={[type.meta, { color: t.glass.dark.muted }]}>
                {[photos.length > 1 ? tr('work.viewerPos', { i: index + 1, n: photos.length }) : null, credit].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  close: { position: 'absolute', right: space.lg, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.lg, gap: 4 },
});
