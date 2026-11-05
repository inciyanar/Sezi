import { arrivalText, coverOf, loc, type NavPoint } from '@sezi/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useGlassInk } from '@/components/glass';
import { LynchLine } from '@/components/lynch-line';
import { PhotoSourceTag } from '@/components/photo-source';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { PlayIcon, StopIcon, TurnIcon } from '@/design/icons';
import { FadeInItem, IconBubble } from '@/design/sweet/components';
import { radius, space, type } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { destinationName, destinationOf } from '@/lib/navigation/destinations';
import { navigation, type NavState } from '@/lib/navigation/session';
import { useWorkPoints } from '@/lib/points';
import { photoUrl, useWork } from '@/lib/works';

/**
 * Varış: fotoğraf, ad, kısa metin ve tek ana düğme (turda sıradaki durak, değilse eser sayfası).
 * Dinle başlığın yanında küçük düğme; kapatma üst çubuktaki X.
 */
export function ArrivalPanel({ state, points, canHear }: { state: NavState; points: NavPoint[]; canHear: boolean }) {
  const t = useSweetTheme();
  const glassInk = useGlassInk();
  const { t: tr, lang } = useT();
  const slug = state.arrived;
  const { data: work } = useWork(slug ?? '');
  const workPts = useWorkPoints();
  // Oturumdaki varışla aynı sıra: eserin özeti, yoksa tarihçe başı, o da yoksa admin'in varış noktası.
  const arrival = arrivalText(slug, workPts, state.plan?.arrival);
  const cover = work ? coverOf(work) : undefined;
  const next = destinationOf(state.tour[0]);

  if (!slug) {
    // Hedefsiz gezinti bitti: görülen noktalar ve yanından geçilen eserler.
    const seen = state.fired.map((id) => points.find((p) => p.id === id) ?? workPts.find((p) => p.id === id)).filter((p): p is NavPoint => !!p);
    return (
      <>
        <Text style={[type.title, { color: glassInk?.text ?? t.text }]} accessibilityRole="header">
          {tr('nav.strollDone')}
        </Text>
        <Text style={[type.lead, { color: glassInk?.muted ?? t.textMuted }]}>{tr('nav.seenCount', { n: seen.length })}</Text>
        <LynchLine
          stops={seen.map((point, index) => ({
            key: point.id,
            kind: point.roles.includes('landmark') ? 'landmark' : 'stop',
            title: point.title[lang] ?? point.title.tr,
            index: index + 1,
            done: true,
          }))}
        />
        <Button label={tr('nav.finish')} onPress={() => router.back()} />
      </>
    );
  }

  const name = work ? loc(work.name, lang) : (arrival?.title[lang] ?? arrival?.title.tr ?? '');
  const body = arrival?.body ? (arrival.body[lang] ?? arrival.body.tr) : '';
  const playing = !!arrival && state.playing === arrival.id;
  return (
    <>
      {/* Varış nadir ve önemli an: başlık, fotoğraf ve metin sırayla gelir (düğme hemen kullanılabilir). */}
      <FadeInItem index={0}>
        <View style={styles.arrivedHead} accessible accessibilityLiveRegion="assertive">
          <TurnIcon turn="straight" arrived color={t.accentText} size={28} />
          <Text style={[type.button, { color: t.accentText }]}>{tr('nav.arrived')}</Text>
        </View>
      </FadeInItem>
      {cover ? (
        <FadeInItem index={1}>
          <View>
            <Image source={{ uri: photoUrl(cover) }} style={[styles.cover, { backgroundColor: t.soft }]} contentFit="cover" accessibilityIgnoresInvertColors accessible={false} />
            <PhotoSourceTag photo={cover} />
          </View>
        </FadeInItem>
      ) : null}
      <FadeInItem index={2} style={styles.titleRow}>
        <View style={{ flex: 1, gap: space.xs }}>
          <Text style={[type.title, { color: glassInk?.text ?? t.text }]} accessibilityRole="header">
            {name}
          </Text>
          {work ? <Text style={[type.meta, { color: glassInk?.muted ?? t.textMuted }]}>{[loc(work.type_name, lang), work.district].filter(Boolean).join(' · ')}</Text> : null}
        </View>
        {arrival && canHear ? (
          <IconBubble
            label={playing ? tr('nav.stopAudio') : tr('nav.listen')}
            icon={(c) => (playing ? <StopIcon color={c} /> : <PlayIcon color={c} />)}
            onPress={() => (playing ? navigation.stopAudio() : navigation.playPoint(arrival.id))}
          />
        ) : null}
      </FadeInItem>
      {body ? (
        <FadeInItem index={3}>
          <Text style={[type.body, { color: glassInk?.text ?? t.text }]}>{body}</Text>
        </FadeInItem>
      ) : null}
      {next ? (
        <Button label={tr('nav.nextStop', { name: destinationName(next, lang) })} onPress={() => void navigation.nextStop()} />
      ) : (
        <Button label={tr('nav.workPage')} onPress={() => router.push({ pathname: '/work/[slug]', params: { slug } })} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  arrivedHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, borderCurve: 'continuous' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
});
