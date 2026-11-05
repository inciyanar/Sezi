import { distanceM, hasLocation, loc } from '@sezi/shared';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/text';

import { FormError, FormScreen } from '@/components/account-fields';
import { Glass, GlassScope, GlassTarget } from '@/components/glass';
import { SeziLoader } from '@/components/sezi-loader';
import { PhotoFields, type PhotoFieldsValue } from '@/components/photo-fields';
import { Button, EmptyState, Field, ListRow } from '@/components/ui';
import { BackIcon, CameraIcon, CloseIcon, ImageIcon, SearchIcon } from '@/design/icons';
import { IconBubble, outline, SoftPressable } from '@/design/sweet/components';
import { radius, space, type } from '@/design/type';
import { WorkGlyph } from '@/design/work-glyph';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useAccount } from '@/lib/account';
import { useT } from '@/lib/i18n';
import { useIdentity } from '@/lib/identity';
import { photoErrorKey, useMyPhotos, usePhotoActions } from '@/lib/photos';
import { useWorks } from '@/lib/works';

export default function NewPhotoScreen() {
  const { work } = useLocalSearchParams<{ work?: string }>();
  const { user } = useAccount();
  const { identity, loading } = useIdentity();
  const { t: tr } = useT();
  if (!user)
    return (
      <FormScreen>
        <EmptyState
          title={tr('photos.title')}
          body={tr('photos.signIn')}
          action={<Button label={tr('account.signIn')} onPress={() => router.push('/account/sign-in')} />}
        />
      </FormScreen>
    );
  if (loading || !identity)
    return (
      <FormScreen>
        <SeziLoader label={tr('account.loading')} />
      </FormScreen>
    );
  return <Editor initialWork={work} initialVisibility={identity.photo_default} />;
}

function Editor({
  initialWork,
  initialVisibility,
}: {
  initialWork?: string;
  initialVisibility: PhotoFieldsValue['visibility'];
}) {
  const { t: tr, lang } = useT();
  const theme = useSweetTheme();
  const works = useWorks();
  const actions = usePhotoActions();
  const myPhotos = useMyPhotos();
  const insets = useSafeAreaInsets();
  const [nearby, setNearby] = useState<number | null>(null);
  const [autoSelect, setAutoSelect] = useState(!initialWork);
  const [workSlug, setWorkSlug] = useState(initialWork ?? '');
  const [search, setSearch] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fields, setFields] = useState<PhotoFieldsValue>({
    altText: '',
    caption: '',
    visibility: initialVisibility,
    suggestArchive: false,
  });
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string>();
  const selected = works.data?.find((row) => row.slug === workSlug);
  const matches = (works.data ?? [])
    .filter((row) =>
      `${row.name.tr} ${row.name.en ?? ''} ${row.slug}`
        .toLocaleLowerCase(lang)
        .includes(search.trim().toLocaleLowerCase(lang)),
    )
    .slice(0, 20);

  useEffect(() => {
    if (!autoSelect || !works.data?.length) return;
    let alive = true;
    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) return;
      const fix = await Location.getLastKnownPositionAsync({ maxAge: 120000 }) ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!fix || !alive) return;
      const nearest = works.data.filter(hasLocation).map((work) => ({
        work, distance: distanceM([fix.coords.longitude, fix.coords.latitude], [work.lng, work.lat]),
      })).sort((a, b) => a.distance - b.distance)[0];
      if (nearest && nearest.distance <= 100 && alive) {
        setWorkSlug(nearest.work.slug);
        setNearby(Math.round(nearest.distance));
        setAutoSelect(false);
      }
    })().catch(() => {});
    return () => { alive = false; };
  }, [autoSelect, works.data]);

  const pick = async (source: 'camera' | 'library') => {
    if (picking || busy) return;
    setPicking(true);
    setError(undefined);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError(tr('photos.err.permission'));
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], exif: false, quality: 1 };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) setAsset(result.assets[0]);
    } catch (e) {
      setError(tr(photoErrorKey(e)));
    } finally {
      setPicking(false);
    }
  };
  const save = async () => {
    if (busy) return;
    if (!selected || !asset || !fields.altText.trim()) {
      setError(tr('photos.err.required'));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await actions.uploadPhoto({
        localUri: asset.uri,
        width: asset.width,
        height: asset.height,
        workSlug,
        ...fields,
      });
      AccessibilityInfo.announceForAccessibility(tr('photos.saved'));
      router.back();
    } catch (e) {
      setError(tr(photoErrorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassScope>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <GlassTarget style={StyleSheet.absoluteFill}>
          {asset ? <Image source={asset.uri} accessibilityLabel={fields.altText || tr('photos.alt')} contentFit="cover" style={StyleSheet.absoluteFill} /> : null}
        </GlassTarget>
        <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Glass tone="dark" radius={radius.pill}>
            <SoftPressable accessibilityRole="button" accessibilityLabel={tr('common.back')} onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <BackIcon color={theme.glass.dark.text} />
            </SoftPressable>
          </Glass>
          <Glass tone="dark" radius={radius.pill} style={{ paddingHorizontal: space.lg, minHeight: 48, justifyContent: 'center' }}>
            <Text style={[type.itemTitle, { color: theme.glass.dark.text }]}>{tr('photos.newTitle')}</Text>
          </Glass>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: asset ? 200 : space.lg, paddingBottom: insets.bottom + space.lg }}>
          <Glass tone="light" radius={radius.xl} style={{ marginHorizontal: space.md, padding: space.lg, gap: space.lg }}>
      {asset ? (
        <View style={{ alignItems: 'flex-end' }}>
          <IconBubble icon={(c) => <ImageIcon color={c} />} label={tr('photos.changePhoto')} onPress={() => void pick('library')} />
        </View>
      ) : (
        <View style={[styles.drop, { borderColor: theme.border }]}>
          <PickButton icon={CameraIcon} label={tr('photos.take')} disabled={busy || picking} onPress={() => void pick('camera')} />
          <PickButton icon={ImageIcon} label={tr('photos.pick')} disabled={busy || picking} onPress={() => void pick('library')} />
        </View>
      )}

      {/* 2. Eser: seçiliyse glifli çip, değilse arama. */}
      {selected ? (
        <View style={[styles.workChip, { backgroundColor: theme.surface }, outline(theme)]}>
          <WorkGlyph slug={selected.type_slug} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={[type.itemTitle, { color: theme.text }]} numberOfLines={2}>{loc(selected.name, lang)}</Text>
            {nearby !== null ? <Text style={[type.meta, { color: theme.textMuted }]}>{tr('photos.nearby', { m: nearby })}</Text> : null}
          </View>
          <IconBubble icon={(c) => <CloseIcon color={c} size={18} />} label={tr('photos.changeWork')} onPress={() => { setAutoSelect(false); setNearby(null); setWorkSlug(''); }} />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <Field
            label={tr('photos.search')}
            value={search}
            onChangeText={setSearch}
            editable={!busy}
            icon={(c) => <SearchIcon color={c} size={20} />}
          />
          {works.isLoading ? (
            <SeziLoader label={tr('account.loading')} />
          ) : null}
          <FormError text={works.error ? tr(photoErrorKey(works.error)) : undefined} />
          {works.error ? (
            <Button variant="secondary" label={tr('explore.retry')} onPress={() => void works.refetch()} />
          ) : null}
          {!works.isLoading && !works.error && matches.length === 0 ? (
            <EmptyState title={tr('photos.noWorks')} />
          ) : null}
          {search.trim() ? (
            <View style={[styles.results, { backgroundColor: theme.surface }, outline(theme)]}>
              {matches.slice(0, 8).map((row, index) => (
                <ListRow
                  key={row.slug}
                  first={index === 0}
                  leading={<WorkGlyph slug={row.type_slug} size={36} />}
                  title={loc(row.name, lang)}
                  subtitle={loc(row.city_name, lang)}
                  onPress={() => {
                    setWorkSlug(row.slug);
                    setAutoSelect(false);
                    setNearby(null);
                    setSearch('');
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}

      {/* 3. Alt metin, açıklama, görünürlük, arşiv. */}
      <PhotoFields value={fields} onChange={setFields} disabled={busy} />
      {fields.visibility === 'public' && myPhotos.data && !myPhotos.data.some((photo) => photo.visibility === 'public') ? (
        <Text style={[type.body, { color: theme.text }]}>{tr('photos.firstStamp')}</Text>
      ) : null}
      <FormError text={error} />
      <Button
        label={tr(busy ? 'photos.saving' : 'photos.publish')}
        arrow
        disabled={busy || picking}
        onPress={() => void save()}
      />
          </Glass>
        </ScrollView>
      </View>
    </GlassScope>
  );
}

/** Büyük seçim düğmesi: simge dairesi + kısa ad (kesikli alanın içinde). */
function PickButton({
  icon: I,
  label,
  onPress,
  disabled,
}: {
  icon: typeof CameraIcon;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const theme = useSweetTheme();
  return (
    <SoftPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.pick, disabled && { opacity: 0.4 }]}>
      <View style={[styles.pickIcon, { backgroundColor: theme.primary.fill }, outline(theme)]}>
        <I color={theme.outlined ? theme.text : theme.primary.ink} size={30} />
      </View>
      <Text style={[type.cardTitle, { color: theme.text, textAlign: 'center' }]}>{label}</Text>
    </SoftPressable>
  );
}

const styles = StyleSheet.create({
  drop: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    minHeight: 180,
    alignItems: 'center',
  },
  pick: { flex: 1, alignItems: 'center', gap: space.sm, paddingVertical: space.lg, minHeight: 48 },
  pickIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  change: { position: 'absolute', right: space.sm, bottom: space.sm },
  workChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  results: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
});
