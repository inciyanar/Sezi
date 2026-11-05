import { isAttributed, isCommons, loc, type WorkPhoto } from '@sezi/shared';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/text';

import { Button, Card, ListRow } from '@/components/ui';
import { ExternalIcon } from '@/design/icons';
import { outline, SweetSheet } from '@/design/sweet/components';
import { font, space } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';

/**
 * Fotoğraf atfı: Commons'ta kaynak adı eklenir, yüklemelerde yazar ve lisans gösterilir.
 * Envanterin mevcut fotoğrafçı kredisi korunur.
 */
export function formatPhotoCredit(photo: WorkPhoto, lang: 'tr' | 'en'): string | null {
  if (!isAttributed(photo)) return photo.credit;
  const author = photo.author?.trim() || (lang === 'tr' ? 'Yazar belirtilmemiş' : 'Author not stated');
  return [author, photo.license?.trim(), isCommons(photo) ? 'Wikimedia Commons' : null].filter(Boolean).join(' · ');
}

export interface PhotoSourceTagProps {
  photo: WorkPhoto | undefined;
  style?: StyleProp<ViewStyle>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

/**
 * Fotoğrafların köşesindeki kaynak işareti: küçük © dairesi (görünen 26 dp, dokunma alanı hitSlop ile 48 dp).
 * Uzun "Wikimedia Commons" hapı kartları kapatıyordu; atıf (yazar, lisans, kaynak) dokununca açılan sayfadadır,
 * ekran okuyucu etiketi ne olduğunu söyler.
 */
export function PhotoSourceTag({ photo, style, position = 'bottom-right' }: PhotoSourceTagProps) {
  const [open, setOpen] = useState(false);
  const t = useSweetTheme();
  const { t: tr, lang } = useT();

  if (!photo || !isAttributed(photo)) return null;

  // Fotoğraf üstünde koyu cam hap; yüksek kontrastta opak zemin ve çerçeve.
  const bg = t.outlined ? t.background : `${t.glass.dark.tint}CC`;
  const fg = t.outlined ? t.text : t.glass.dark.text;
  const authorText = photo.author?.trim() || tr('commons.authorMissing');
  const modText = loc(photo.modifications, lang);

  return (
    <>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${tr('commons.tagLabel')}: ${isCommons(photo) ? tr('commons.tag') : tr('commons.photoBy', { author: authorText })}`}
        hitSlop={11}
        style={[styles.tag, posStyle[position], { backgroundColor: bg }, outline(t), style]}>
        <Text style={[styles.tagText, { color: fg }]}>©</Text>
      </Pressable>

      <SweetSheet visible={open} onClose={() => setOpen(false)} title={tr(isCommons(photo) ? 'commons.sheetTitle' : 'photo.sourceTitle')}>
        <View style={styles.sheetContent}>
          <Card padded={false}>
            <ListRow first title={tr('commons.photoBy', { author: authorText })} />
            {photo.license ? (
              <ListRow
                title={tr('commons.license', { license: photo.license })}
                hint={photo.license_url ? tr('commons.openLicense') : undefined}
                trailing={photo.license_url ? <ExternalIcon color={t.primaryText} size={16} /> : null}
                onPress={photo.license_url ? () => void Linking.openURL(photo.license_url!).catch(() => {}) : undefined}
              />
            ) : null}
            {modText ? <ListRow title={tr('commons.modifications', { modifications: modText })} /> : null}
          </Card>
          {photo.source_url ? (
            <Button
              variant="outline"
              label={tr(isCommons(photo) ? 'commons.openSource' : 'photo.openSource')}
              icon={(c) => <ExternalIcon color={c} size={18} />}
              onPress={() => void Linking.openURL(photo.source_url!).catch(() => {})}
            />
          ) : null}
        </View>
      </SweetSheet>
    </>
  );
}

/** Küçük listeleme resimlerinde (< ~120 dp) tıklanamayan © işareti; atıf eser sayfasındaki işaretten açılır. */
export function PhotoSourceThumbTag({ photo, style }: { photo: WorkPhoto | undefined; style?: StyleProp<ViewStyle> }) {
  const t = useSweetTheme();

  if (!photo || !isAttributed(photo)) return null;

  const bg = t.outlined ? t.background : `${t.glass.dark.tint}B3`;
  const fg = t.outlined ? t.text : t.glass.dark.text;

  return (
    <View pointerEvents="none" accessible={false} style={[styles.thumbTag, { backgroundColor: bg }, outline(t), style]}>
      <Text style={[styles.thumbTagText, { color: fg }]}>©</Text>
    </View>
  );
}

const posStyle = {
  'bottom-right': { bottom: space.sm, right: space.sm },
  'bottom-left': { bottom: space.sm, left: space.sm },
  'top-right': { top: space.sm, right: space.sm },
  'top-left': { top: space.sm, left: space.sm },
};

const styles = StyleSheet.create({
  tag: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontFamily: font.bodyBold,
    fontSize: 14,
    lineHeight: 17,
  },
  thumbTag: {
    position: 'absolute',
    bottom: space.xs,
    right: space.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbTagText: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    lineHeight: 14,
  },
  sheetContent: {
    paddingHorizontal: space.xl,
    gap: space.md,
    paddingBottom: space.lg,
  },
});
