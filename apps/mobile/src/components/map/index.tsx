import Mapbox, { Camera, CircleLayer, FillExtrusionLayer, FillLayer, Image as MapImage, Images, LineLayer, MapView, ShapeSource, StyleImport, SymbolLayer } from '@rnmapbox/maps';
import { GLYPH_TYPES, glyphType, LANDMARK_FULL_ZOOM, LANDMARK_MIN_ZOOM, LANDMARK_OPACITY, laneOffsetPx, MAP_PITCH, PilotBuildingsSchema, polylineLength, ROUTE_ARROW_SPACING_PX, ROUTE_FLOW_DASHES, ROUTE_FLOW_STEP_MS, routeLineParts, sliceLine, stopConnector, toneForType, type LinePart, type LngLat, type RoutePiece } from '@sezi/shared';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { InteractionManager, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { StarIcon } from '@/design/icons';
import { WorkGlyphInline } from '@/design/work-glyph';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useIsDark, useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';
import { boundsOf, useMajorLandmarks } from '@/lib/nav';
import { useProfile } from '@/lib/profile';

import pilotBuildings from '../../../assets/pilot/bursa-hanlar-buildings.json';

/**
 * Uygulamanın harita katmanı (Mapbox). Ekranlar harita kütüphanesini doğrudan kullanmaz:
 * rota, nokta ve konum çizimleri buradaki bileşenlerle yapılır; kütüphane değişince yalnızca bu dosya değişir.
 */
void Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);

/** Harita yazı tipi (Mapbox glif servisi). */
const FONT = ['DIN Pro Medium', 'Arial Unicode MS Regular'];
const FONT_BOLD = ['DIN Pro Bold', 'Arial Unicode MS Bold'];

/**
 * Mapbox Standard: dükkân etiketleri kapalı; zemin renkleri Standard temasına bırakılır.
 * 3B binalar açık (Standard'ın kendi verisi); pilot alanın büyük yer işaretleri ayrıca vurgulanır (`PilotLandmarks`, `MajorLandmarks`).
 * Koyu temada gece ışığı; az gören profilinde ve yüksek kontrastta tek renkli, düz harita (3B yok:
 * gölgeli cepheler kontrastı düşürür).
 */
function useStandardConfig() {
  const dark = useIsDark();
  const t = useSweetTheme();
  const { profile } = useProfile();
  const plain = profile?.vision === 'low' || t.outlined;
  return {
    lightPreset: dark ? 'night' : 'day',
    theme: plain ? 'monochrome' : 'faded',
    show3dObjects: !plain,
    showPointOfInterestLabels: false,
    showTransitLabels: true,
    showPlaceLabels: true,
    showRoadLabels: true,
    // Renkleri yalnız açık temada ayarlayıp sonra çıkarmak native stilin eski değerleri tutmasına yol açabilir.
    // Gece ve tek renkli temalar dahil, zemin paletini Standard yönetsin.
    showPedestrianRoads: true,
  } as const;
}

/** Eğik (3B) bakış: yalnız etkileşimli haritada, hareket azaltma ve sade harita (az gören, yüksek kontrast) kapalıyken. */
function usePitch(interactive: boolean) {
  const t = useSweetTheme();
  const reduced = useReducedMotion();
  const { profile } = useProfile();
  return interactive && !reduced && !t.outlined && profile?.vision !== 'low' ? MAP_PITCH : 0;
}

type Padding = { top?: number; bottom?: number; left?: number; right?: number };
const pad = (p?: Padding) => ({ paddingTop: p?.top ?? 48, paddingBottom: p?.bottom ?? 48, paddingLeft: p?.left ?? 40, paddingRight: p?.right ?? 40 });

export interface SeziMapHandle {
  /** Noktaları ekrana sığdırır (tek nokta ise ona yakınlaşır). */
  fit(points: LngLat[], padding?: Padding): void;
  centerOn(p: LngLat, zoom?: number): void;
}

interface SeziMapProps {
  /** İlk görünüm: noktalar sığdırılır (tek nokta ise ona yakınlaşılır). */
  initial: LngLat[];
  initialPadding?: Padding;
  /** Tek nokta açılışındaki yakınlık. */
  initialZoom?: number;
  onPress?: (p: LngLat) => void;
  /** false: harita yalnızca gösterir (kaydırma, yakınlaştırma yok). */
  interactive?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Harita, ekranın ilk çizimi ve geçiş animasyonu bittikten sonra yüklenir:
 * ilk açılışta ekran akıcı kalır, harita hemen ardından gelir.
 */
function useDeferred() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setReady(true), 120);
    });
    return () => {
      task.cancel();
      clearTimeout(timer);
    };
  }, []);
  return ready;
}

export const SeziMap = forwardRef<SeziMapHandle, SeziMapProps>(function SeziMap(
  { initial, initialPadding, initialZoom = 16.5, onPress, interactive = true, accessibilityLabel, style, children },
  ref,
) {
  const t = useSweetTheme();
  const camera = useRef<ComponentRef<typeof Camera>>(null);
  const ready = useDeferred();
  const config = useStandardConfig();
  const pitch = usePitch(interactive);
  // defaultSettings yalnız ilk açılışta uygulanır: profil, yüksek kontrast ya da hareket azaltma harita açıkken
  // değişirse eğim mevcut kameraya animasyonsuz taşınır (düz haritaya geçişte kamera eğik kalmasın).
  useEffect(() => {
    camera.current?.setCamera({ pitch, animationDuration: 0 });
  }, [pitch]);
  useImperativeHandle(ref, () => ({
    fit(points, padding) {
      if (points.length === 0) return;
      if (points.length === 1) {
        camera.current?.setCamera({ centerCoordinate: points[0]!, zoomLevel: 17, animationDuration: 500 });
        return;
      }
      const [w, s, e, n] = boundsOf(points);
      camera.current?.setCamera({ bounds: { ne: [e, n], sw: [w, s] }, padding: pad(padding), animationDuration: 600 });
    },
    centerOn(p, zoom) {
      camera.current?.setCamera({ centerCoordinate: p, ...(zoom ? { zoomLevel: zoom } : {}), animationDuration: 500, animationMode: 'easeTo' });
    },
  }));
  const [w, s, e, n] = initial.length > 1 ? boundsOf(initial) : [0, 0, 0, 0];
  // İlk görünüm: noktaların ortası; sığdırma harita yüklenince yapılır.
  const defaultSettings = {
    centerCoordinate: initial.length > 1 ? ([(w + e) / 2, (s + n) / 2] as LngLat) : (initial[0] ?? ([29.0613, 40.1842] as LngLat)),
    zoomLevel: initial.length > 1 ? 15 : initialZoom,
    pitch,
  };
  return (
    // Harita ekran okuyucuya tek öğe olarak sunulur; içerik ekrandaki listelerde yazılı olarak var.
    <View style={[{ backgroundColor: t.soft, overflow: 'hidden' }, style]} accessible accessibilityLabel={accessibilityLabel} importantForAccessibility="no-hide-descendants">
      {ready ? (
        <MapView
          style={StyleSheet.absoluteFill}
          styleURL="mapbox://styles/mapbox/standard"
          scaleBarEnabled={false}
          compassEnabled={false}
          pitchEnabled={pitch > 0}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          rotateEnabled={interactive}
          logoPosition={{ bottom: 8, left: 8 }}
          attributionPosition={{ bottom: 8, right: 8 }}
          onPress={onPress ? (f) => onPress(f.geometry.coordinates as LngLat) : undefined}
          // Harita boyutu belli olunca ilk noktalar sığdırılır (ilk çizimde harita henüz yerleşmemiş olabilir).
          onDidFinishLoadingMap={() => {
            if (initial.length > 1) camera.current?.setCamera({ bounds: { ne: [e, n], sw: [w, s] }, padding: pad(initialPadding), animationDuration: 0 });
          }}>
          <StyleImport id="basemap" existing config={config} />
          <Camera ref={camera} defaultSettings={defaultSettings} />
          <TypeIcons />
          <PilotDistrict />
          <PilotLandmarks />
          <MajorLandmarkBadges />
          {children}
          <MajorLandmarkLabels />
        </MapView>
      ) : null}
    </View>
  );
});

/** Harita resim adı: tema değişince yeni ad, eski resim önbellekte kalmaz. Simgesi olmayan tür `diger`. */
const iconName = (slug: string, theme: string) => `type-${theme}-${glyphType(slug)}`;
const ICON_SIZE = 36;
/** Büyük yer işareti rozeti: eser simgesinden belirgin büyük; üstüne eser simgesi binerse altın halka olarak görünür. */
const LANDMARK_SIZE = 56;
const landmarkName = (glyph: string, theme: string) => `landmark-${theme}-${glyph}`;
/** Esere bağlı olmayan büyük yer işareti (kule, meydan yapısı): yıldız. */
const LANDMARK_STAR = 'star';
const ROUTE_WIDTH = 6;
const ARROW_SIZE = 16;
const arrowName = (theme: string) => `route-arrow-${theme}`;
// Standard'ın gece ışığı navigasyon işaretlerini karartmasın.
const OVERLAY_EMISSIVE = 1;

/**
 * Eser türü simgeleri: karşıt renkli dış kasa, yüzey dolgusu ve tür mürekkebinde glif.
 * Siluet türü anlatır; renk tek başına anlam taşımaz. Native taraf her görünümü bir kez resme çevirir.
 */
function TypeIcons() {
  const t = useSweetTheme();
  const theme = useThemeKey();
  const majors = useMajorLandmarks();
  const landmarkGlyphs = [...new Set(majors.map((m) => (m.workType ? glyphType(m.workType) : LANDMARK_STAR)))];
  return (
    <Images>
      <MapImage name={arrowName(theme)}>
        {/* Sağa bakan şevron: çizgi yerleşimi resmi yürüyüş yönüne döndürür. */}
        <View collapsable={false} style={{ width: ARROW_SIZE, height: ARROW_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 7, height: 7, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: t.surface, transform: [{ rotate: '45deg' }] }} />
        </View>
      </MapImage>
      {GLYPH_TYPES.map((slug) => {
        const ink = t.tones[toneForType(slug)].ink;
        return (
          <MapImage key={slug} name={iconName(slug, theme)}>
            {/* collapsable={false}: düzleştirilirse SVG ikinci çocuk olur, native taraf yalnız tek görünümü resme çevirir. */}
            <View collapsable={false} style={{ width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE / 2, backgroundColor: t.surface, borderWidth: 2.5, borderColor: t.text, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: ink, alignItems: 'center', justifyContent: 'center' }}>
                <WorkGlyphInline slug={slug} color={ink} size={19} />
              </View>
            </View>
          </MapImage>
        );
      })}
      {landmarkGlyphs.map((glyph) => (
        <MapImage key={`landmark-${glyph}`} name={landmarkName(glyph, theme)}>
          {/* Altın dolgu, kalın mürekkep kasa: harita zemininde ve 3B binaların önünde uzaktan seçilir. */}
          <View collapsable={false} style={{ width: LANDMARK_SIZE, height: LANDMARK_SIZE, borderRadius: LANDMARK_SIZE / 2, backgroundColor: t.gold.fill, borderWidth: 3, borderColor: t.text, alignItems: 'center', justifyContent: 'center' }}>
            {glyph === LANDMARK_STAR ? <StarIcon color={t.gold.ink} size={28} /> : <WorkGlyphInline slug={glyph} color={t.gold.ink} size={28} />}
          </View>
        </MapImage>
      ))}
      {DOT_KEYS.map((key) => (
        <MapImage key={`dot-${key}`} name={dotName(key, theme)}>
          <View collapsable={false} style={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: t.text, padding: 2 }}>
            <View style={{ flex: 1, borderRadius: DOT_SIZE / 2, backgroundColor: dotColor(t, key), borderWidth: 2, borderColor: t.surface }} />
          </View>
        </MapImage>
      ))}
    </Images>
  );
}

function useThemeKey() {
  const dark = useIsDark();
  const t = useSweetTheme();
  return t.outlined ? 'hc' : dark ? 'dark' : 'light';
}

/**
 * Nokta tabanları da resim (simge) olarak çizilir: daire katmanının aksine simgeler 3B bina arkasında
 * soluklaşmaz (`iconOcclusionOpacity`). Boyut `iconSize` ile (yarıçap / 12).
 */
const DOT_KEYS = ['accent', 'text', 'primary', 'muted', 'stop', 'activeStop'] as const;
type DotKey = (typeof DOT_KEYS)[number];
const DOT_SIZE = 32; // Dış mürekkep kasası ve iç yüzey kenarı harita zemininden ayırır.
const dotName = (key: DotKey, theme: string) => `dot-${theme}-${key}`;
function dotColor(t: ReturnType<typeof useSweetTheme>, key: DotKey) {
  return key === 'stop' ? t.glass.dark.tint : key === 'activeStop' ? t.gold.fill : key === 'accent' ? t.accentText : key === 'text' ? t.text : key === 'primary' ? t.primaryText : t.textMuted;
}

/** Veri hattının ürettiği pilot alan binaları (`data/build_buildings.py`); uygulamaya gömülü. */
const PILOT = PilotBuildingsSchema.parse(pilotBuildings);

/** Lynch "bölge": pilot alan (Ulu Cami ve Hanlar). Yollar ve binaların altında hafif dolgu, kesikli kenar. */
function PilotDistrict() {
  const t = useSweetTheme();
  if (!PILOT.district) return null;
  return (
    <ShapeSource id="district-src" shape={{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: PILOT.district.polygon } }}>
      <FillLayer id="district-fill" slot="bottom" style={{ fillColor: t.primaryText, fillOpacity: t.outlined ? 0 : 0.06 }} />
      <LineLayer id="district-edge" slot="bottom" style={{ lineColor: t.primaryText, lineWidth: t.outlined ? 2.5 : 1.5, lineOpacity: t.outlined ? 1 : 0.45, lineDasharray: [2, 1.5] }} />
    </ShapeSource>
  );
}

/** `middle` slotunda boş çapa: slot almayan 3B katman bunun hemen üstüne yerleşir, rota (sonra eklenir) ve noktalar (`top`) üstte kalır. */
const ANCHOR_ID = 'sezi-landmark-anchor';

/**
 * Lynch "yer işareti": pilot alandaki eser binaları tür tonunda, Mapbox'ın aynı binasından 1 m yüksek ve biraz
 * geniş 3B blok. FillExtrusionLayer bu sürümde `slot` almadığı için `middle` slotundaki çapanın üstüne konur.
 * 3B kapalıyken (az gören, yüksek kontrast) aynı yerde düz dolgu ve kalın kenar.
 */
function PilotLandmarks() {
  const t = useSweetTheme();
  const { profile } = useProfile();
  const majors = useMajorLandmarks();
  const slugs = useMemo(() => majors.flatMap((m) => (m.workSlug ? [m.workSlug] : [])), [majors]);
  const flat = profile?.vision === 'low' || t.outlined;
  const byType = (pick: (tone: { fill: string; ink: string }) => string) =>
    [
      'match',
      ['get', 't'],
      ...GLYPH_TYPES.flatMap((slug) => [slug, pick(t.tones[toneForType(slug)])]),
      pick(t.tones[toneForType('diger')]),
    ] as const;
  // Yalnız büyük yer işareti olan eserlerin binası vurgulanır (Lynch: az ve seçici).
  const only = ['in', ['get', 'w'], ['literal', slugs]] as const;
  return (
    <ShapeSource id="landmarks-src" shape={PILOT.landmarks}>
      <LineLayer id={ANCHOR_ID} slot="middle" filter={['==', ['get', 'w'], '']} style={{ lineOpacity: 0 }} />
      {flat ? (
        <>
          <FillLayer id="landmarks-fill" slot="middle" filter={only} style={{ fillColor: t.outlined ? t.surface : byType((tone) => tone.fill) }} />
          <LineLayer id="landmarks-edge" slot="middle" filter={only} style={{ lineColor: t.outlined ? t.text : byType((tone) => tone.ink), lineWidth: 2.5 }} />
        </>
      ) : (
        <FillExtrusionLayer
          id="landmarks-3d"
          aboveLayerID={ANCHOR_ID}
          filter={only}
          minZoomLevel={LANDMARK_MIN_ZOOM}
          maxZoomLevel={24}
          style={{
            fillExtrusionColor: byType((tone) => tone.fill),
            fillExtrusionHeight: ['interpolate', ['linear'], ['zoom'], LANDMARK_MIN_ZOOM, 0, LANDMARK_FULL_ZOOM, ['get', 'h']],
            fillExtrusionBase: ['get', 'b'],
            fillExtrusionOpacity: LANDMARK_OPACITY,
            fillExtrusionVerticalGradient: true,
            fillExtrusionAmbientOcclusionIntensity: 0.25,
          }}
        />
      )}
    </ShapeSource>
  );
}

/**
 * Büyük yer işaretleri (Lynch landmark): her haritada altın rozet ve kalın adla. Rozet ekranın kendi noktalarının
 * altına çizilir (aynı yerdeki eser simgesi rozetin ortasına biner, altın halka kalır); ad ise en üste:
 * yazılar yerleştirilirken üstteki katman önce yer alır, böylece büyük yer işaretinin adı küçük eser adlarına yer
 * kaybetmez. Uzaklaştıkça küçülür ama kaybolmaz: yön bulmanın dayanağıdır.
 */
function useMajorShape() {
  const theme = useThemeKey();
  const { lang } = useT();
  const majors = useMajorLandmarks();
  return useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: majors.map((m) => ({
        type: 'Feature',
        properties: { icon: landmarkName(m.workType ? glyphType(m.workType) : LANDMARK_STAR, theme), label: m.name[lang] ?? m.name.tr },
        geometry: { type: 'Point', coordinates: m.location },
      })),
    }),
    [majors, theme, lang],
  );
}

function MajorLandmarkBadges() {
  const shape = useMajorShape();
  if (!shape.features.length) return null;
  return (
    <ShapeSource id="major-landmarks-src" shape={shape}>
      <SymbolLayer
        id="major-landmarks-icon"
        slot="top"
        style={{
          iconImage: ['get', 'icon'],
          iconSize: ['interpolate', ['linear'], ['zoom'], 13, 0.6, 16, 1],
          iconAllowOverlap: true,
          iconIgnorePlacement: true,
          iconOcclusionOpacity: 1,
          iconEmissiveStrength: OVERLAY_EMISSIVE,
        }}
      />
    </ShapeSource>
  );
}

function MajorLandmarkLabels() {
  const t = useSweetTheme();
  const shape = useMajorShape();
  if (!shape.features.length) return null;
  return (
    <ShapeSource id="major-landmark-names-src" shape={shape}>
      <SymbolLayer
        id="major-landmarks-label"
        slot="top"
        minZoomLevel={13.5}
        style={{
          textField: ['get', 'label'],
          textFont: FONT_BOLD,
          textSize: 14,
          textAnchor: 'bottom',
          textOffset: [0, -2.2],
          textMaxWidth: 10,
          textOptional: true,
          textColor: t.text,
          textHaloColor: t.surface,
          textHaloWidth: 2,
          textOcclusionOpacity: 1,
          textEmissiveStrength: OVERLAY_EMISSIVE,
        }}
      />
    </ShapeSource>
  );
}

/** Segment rengi ve şerit kayması; aynı bacak/şerit birleşimleri okları ve akışı taşır. */
function lineFeatures(parts: LinePart[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features: parts.map((part) => ({
      type: 'Feature',
      properties: { leg: part.leg, progress: part.progress, offset: laneOffsetPx(part.lane, ROUTE_WIDTH), arrowOffset: [0, laneOffsetPx(part.lane, ROUTE_WIDTH)] },
      geometry: { type: 'LineString', coordinates: part.coords },
    })),
  };
}

/** Rota: yön okları, git-dön şeritleri ve bacak vurgusu; hareket yalnız önizlemede açıktır. */
export function RouteLine({ id = 'route', pieces, activeLeg = null, walked, animate = false }: { id?: string; pieces: RoutePiece[]; activeLeg?: number | null; walked?: LngLat[]; animate?: boolean }) {
  const t = useSweetTheme();
  const theme = useThemeKey();
  const reduced = useReducedMotion();
  const flowing = animate && !reduced && !t.outlined;
  const [flowStep, setFlowStep] = useState(0);
  const { parts, runs } = useMemo(() => routeLineParts(pieces), [pieces]);
  const shape = useMemo(() => lineFeatures(parts), [parts]);
  const runShape = useMemo(() => lineFeatures(runs), [runs]);
  const walkedShape = useMemo(() => {
    let remaining = walked ? polylineLength(walked) : 0;
    const completed: LinePart[] = [];
    for (const part of parts) {
      if (remaining <= 0) break;
      const length = polylineLength(part.coords);
      completed.push({ ...part, coords: remaining >= length ? part.coords : sliceLine(part.coords, 0, remaining) });
      remaining -= length;
    }
    return lineFeatures(completed);
  }, [parts, walked]);
  useEffect(() => {
    if (!flowing) return;
    const timer = setInterval(() => setFlowStep((step) => (step + 1) % ROUTE_FLOW_DASHES.length), ROUTE_FLOW_STEP_MS);
    return () => clearInterval(timer);
  }, [flowing]);
  const opacity = activeLeg === null ? 1 : ['case', ['==', ['get', 'leg'], activeLeg], 1, 0.3] as const;
  if (!parts.length) return null;
  return (
    <>
      <ShapeSource id={`${id}-src`} shape={shape}>
        <LineLayer id={`${id}-casing`} slot="middle" style={{ lineCap: 'round', lineJoin: 'round', lineColor: t.surface, lineWidth: 11, lineOffset: ['get', 'offset'], lineOpacity: opacity, lineEmissiveStrength: OVERLAY_EMISSIVE }} />
        <LineLayer id={`${id}-line`} slot="middle" style={{ lineCap: 'round', lineJoin: 'round', lineColor: t.outlined ? t.primaryText : ['interpolate', ['linear'], ['get', 'progress'], 0, t.primaryText, 1, t.accentText], lineWidth: ROUTE_WIDTH, lineOffset: ['get', 'offset'], lineOpacity: opacity, lineEmissiveStrength: OVERLAY_EMISSIVE }} />
      </ShapeSource>
      {walkedShape.features.length ? (
        <ShapeSource id={`${id}-walked-src`} shape={walkedShape}>
          <LineLayer id={`${id}-walked`} slot="middle" style={{ lineCap: 'round', lineJoin: 'round', lineColor: t.textMuted, lineWidth: ROUTE_WIDTH, lineOffset: ['get', 'offset'], lineOpacity: ['*', opacity, 0.7], lineEmissiveStrength: OVERLAY_EMISSIVE }} />
        </ShapeSource>
      ) : null}
      <ShapeSource id={`${id}-runs-src`} shape={runShape}>
        {flowing ? (
          <LineLayer
            id={`${id}-flow`}
            slot="middle"
            filter={activeLeg === null ? ['has', 'leg'] : ['==', ['get', 'leg'], activeLeg]}
            style={{ lineColor: t.surface, lineWidth: ROUTE_WIDTH * 0.4, lineOffset: ['get', 'offset'], lineOpacity: 0.6, lineDasharray: [...ROUTE_FLOW_DASHES[flowStep]!], lineEmissiveStrength: OVERLAY_EMISSIVE }}
          />
        ) : <></>}
        <SymbolLayer
          id={`${id}-arrows`}
          slot="middle"
          style={{ symbolPlacement: 'line', symbolSpacing: ROUTE_ARROW_SPACING_PX, iconImage: arrowName(theme), iconSize: 1, iconRotationAlignment: 'map', iconKeepUpright: false, iconOffset: ['get', 'arrowOffset'], iconOpacity: opacity, iconAllowOverlap: true, iconIgnorePlacement: true, iconOcclusionOpacity: 1, iconEmissiveStrength: OVERLAY_EMISSIVE }}
        />
      </ShapeSource>
    </>
  );
}

/**
 * Seçilmemiş rota seçenekleri: soluk gri çizgi, zeminden kenarla ayrılır. Basılınca `onPress(id)` (seçenek seçilir).
 * Seçili rota (`RouteLine`) bundan sonra eklenir, ortak yollarda üstte kalır.
 */
export function AltLines({ lines, onPress }: { lines: { id: string; line: LngLat[] }[]; onPress: (id: string) => void }) {
  const t = useSweetTheme();
  const shape: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
    type: 'FeatureCollection',
    features: lines.map((l) => ({ type: 'Feature', properties: { id: l.id }, geometry: { type: 'LineString', coordinates: l.line } })),
  };
  return (
    <ShapeSource
      id="alt-routes-src"
      shape={shape}
      hitbox={{ width: 32, height: 32 }}
      onPress={(e) => {
        const hit = e.features[0]?.properties?.id;
        if (typeof hit === 'string') onPress(hit);
      }}>
      <LineLayer id="alt-routes-casing" slot="middle" style={{ lineCap: 'round', lineJoin: 'round', lineColor: t.surface, lineWidth: ROUTE_WIDTH + 4, lineEmissiveStrength: OVERLAY_EMISSIVE }} />
      <LineLayer id="alt-routes-line" slot="middle" style={{ lineCap: 'round', lineJoin: 'round', lineColor: t.textMuted, lineWidth: ROUTE_WIDTH, lineEmissiveStrength: OVERLAY_EMISSIVE }} />
    </ShapeSource>
  );
}

/** Ek çizgiler: kapalı yollar (kesikli) ya da karşılaştırmadaki diğer rotalar. */
export function ExtraLines({ id, data, color, width = 5, dashed, opacity = 1 }: { id: string; data: GeoJSON.FeatureCollection | GeoJSON.Feature; color: string; width?: number; dashed?: boolean; opacity?: number }) {
  return (
    <ShapeSource id={`${id}-src`} shape={data}>
      <LineLayer
        id={`${id}-line`}
        slot="middle"
        style={{ lineCap: dashed ? 'butt' : 'round', lineJoin: 'round', lineColor: color, lineWidth: width, lineOpacity: opacity, lineEmissiveStrength: OVERLAY_EMISSIVE, ...(dashed ? { lineDasharray: [1.4, 1] } : {}) }}
      />
    </ShapeSource>
  );
}

export type MapPointKind = 'story' | 'arrival' | 'landmark' | 'start' | 'work';

export interface MapPoint {
  id: string;
  location: LngLat;
  kind: MapPointKind;
  /** Rotadaki sıra numarası (uğranacak noktalar). */
  order?: number;
  label?: string;
  /** Açılmış / geçilmiş nokta: soluk. */
  done?: boolean;
  selected?: boolean;
  /** Eser türü (work_types.slug): verilirse nokta türün simgesiyle çizilir (siluet türü anlatır). */
  typeSlug?: string;
}

/** Numaralı durak çizgi üstünde kalır; eserin gerçek yeri uzaktaysa kesikli bağ gösterilir. */
export function StopBadges({ id = 'stops', stops, onPress }: { id?: string; stops: (MapPoint & { onLine: LngLat })[]; onPress?: (pointId: string) => void }) {
  const t = useSweetTheme();
  const connectors: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
    type: 'FeatureCollection',
    features: stops.flatMap((stop) => {
      const coords = stopConnector(stop.onLine, stop.location);
      return coords ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] : [];
    }),
  };
  return (
    <>
      <ShapeSource id={`${id}-connectors-src`} shape={connectors}>
        <LineLayer id={`${id}-connectors`} slot="middle" style={{ lineColor: t.textMuted, lineWidth: 1.5, lineDasharray: [2, 2], lineEmissiveStrength: OVERLAY_EMISSIVE }} />
      </ShapeSource>
      <PointsLayer id={id} points={stops.map((stop) => ({ ...stop, location: stop.onLine }))} onPress={onPress} />
    </>
  );
}

/** Seçili simge yaklaşık 1,25 kat; harita animasyonu değil, yeniden çizim (hareket azaltmadan etkilenmez). */
const ICON_SCALE = 0.95;
const ICON_SCALE_SELECTED = 1.2;

/** Noktalar: sıra numaralı anlatım noktaları, yer işaretleri, başlangıçlar, eserler (türü varsa simgeyle). Basılınca `onPress(id)`. */
export function PointsLayer({ id = 'points', points, onPress }: { id?: string; points: MapPoint[]; onPress?: (pointId: string) => void }) {
  const t = useSweetTheme();
  const theme = useThemeKey();
  const dotOf: Record<MapPointKind, DotKey> = { story: 'accent', arrival: 'accent', landmark: 'text', start: 'primary', work: 'primary' };
  // Büyük yer işareti olan eser rozetin üstüne çizilir (altın halka kalır, iki ayrı işaret olmaz); adı rozetin
  // üstünde zaten yazılı olduğundan altta ikinci kez yazılmaz.
  const majors = useMajorLandmarks();
  const badgeAt = new Map(majors.flatMap((m) => (m.workSlug ? [[m.workSlug, m.location] as const] : [])));
  const shape: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      properties: {
        id: p.id,
        dot: dotName(p.order ? (p.selected ? 'activeStop' : 'stop') : p.done ? 'muted' : dotOf[p.kind], theme),
        // Yarıçap 12'ye göre ölçek: numaralı 12, diğerleri en az 8; seçili +3.
        dotScale: ((p.order ? 12 : 8) + (p.selected ? 3 : 0)) / 12,
        order: p.order ? String(p.order) : '',
        label: badgeAt.has(p.id) ? '' : (p.label ?? ''),
        icon: p.typeSlug && !p.order ? iconName(p.typeSlug, theme) : '',
        scale: p.selected ? ICON_SCALE_SELECTED : ICON_SCALE,
        done: p.done ? 1 : 0,
        selected: p.selected ? 1 : 0,
      },
      // Numaralı durak çizgi üstünde kalır; diğerleri rozetin yerine.
      geometry: { type: 'Point', coordinates: (!p.order && badgeAt.get(p.id)) || p.location },
    })),
  };
  return (
    <ShapeSource
      id={`${id}-src`}
      shape={shape}
      hitbox={{ width: 48, height: 48 }}
      onPress={
        onPress
          ? (e) => {
              const hit = e.features[0]?.properties?.id;
              if (typeof hit === 'string') onPress(hit);
            }
          : undefined
      }>
      <SymbolLayer
        id={`${id}-icon`}
        slot="top"
        filter={['!=', ['get', 'icon'], '']}
        style={{ iconImage: ['get', 'icon'], iconSize: ['get', 'scale'], iconOpacity: ['case', ['==', ['get', 'done'], 1], 0.75, 1], iconAllowOverlap: true, iconIgnorePlacement: true, iconOcclusionOpacity: 1, iconEmissiveStrength: OVERLAY_EMISSIVE }}
      />
      {/* Sıra: tür simgeleri < nokta tabanları < numara; rota sırası (numaralı durak) her zaman üstte. */}
      <SymbolLayer
        id={`${id}-dot`}
        slot="top"
        filter={['==', ['get', 'icon'], '']}
        style={{ iconImage: ['get', 'dot'], iconSize: ['get', 'dotScale'], iconAllowOverlap: true, iconIgnorePlacement: true, iconOcclusionOpacity: 1, iconEmissiveStrength: OVERLAY_EMISSIVE }}
      />
      <SymbolLayer id={`${id}-order`} slot="top" style={{ textField: ['get', 'order'], textFont: FONT, textSize: 13, textColor: ['case', ['==', ['get', 'selected'], 1], t.gold.ink, t.onPhoto.text], textAllowOverlap: true, textIgnorePlacement: true, textOcclusionOpacity: 1, textEmissiveStrength: OVERLAY_EMISSIVE }} />
      <SymbolLayer
        id={`${id}-label`}
        slot="top"
        minZoomLevel={14.5}
        style={{ textField: ['get', 'label'], textFont: FONT, textSize: 12, textOffset: [0, 1.5], textAnchor: 'top', textMaxWidth: 9, textOptional: true, textColor: t.text, textHaloColor: t.surface, textHaloWidth: 1.5, textEmissiveStrength: OVERLAY_EMISSIVE }}
      />
    </ShapeSource>
  );
}

/** Eser haritası: kümelenmiş eserler; seçili eser vurgulu. Basılınca `onPress(slug)`. */
export function WorkClusters({ works, selected, onPress }: { works: { slug: string; location: LngLat; typeSlug: string }[]; selected: string | null; onPress: (slug: string) => void }) {
  const t = useSweetTheme();
  const theme = useThemeKey();
  const shape: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: works.map((w) => ({
      type: 'Feature',
      properties: { slug: w.slug, icon: iconName(w.typeSlug, theme), scale: w.slug === selected ? ICON_SCALE_SELECTED : ICON_SCALE },
      geometry: { type: 'Point', coordinates: w.location },
    })),
  };
  return (
    <ShapeSource
      id="works-src"
      shape={shape}
      cluster
      clusterRadius={40}
      clusterMaxZoomLevel={15}
      hitbox={{ width: 24, height: 24 }}
      onPress={(e) => {
        const slug = e.features[0]?.properties?.slug;
        if (typeof slug === 'string') onPress(slug);
      }}>
      <CircleLayer id="works-clusters" slot="top" filter={['has', 'point_count']} style={{ circleRadius: ['step', ['get', 'point_count'], 18, 10, 22, 40, 28], circleColor: t.primary.fill, circleStrokeWidth: 3, circleStrokeColor: t.surface, circleEmissiveStrength: OVERLAY_EMISSIVE }} />
      <SymbolLayer id="works-cluster-label" slot="top" filter={['has', 'point_count']} style={{ textField: ['get', 'point_count_abbreviated'], textSize: 14, textFont: FONT, textColor: t.primary.ink, textAllowOverlap: true, textEmissiveStrength: OVERLAY_EMISSIVE }} />
      {/* Seçili eser: simgenin altında vurgu halkası (renk dışında boyutla da ayrılır). */}
      <CircleLayer id="works-selected" slot="top" filter={['==', ['get', 'slug'], selected ?? '']} style={{ circleRadius: 22, circleColor: t.accentText, circleOpacity: 0.22, circleStrokeWidth: 2.5, circleStrokeColor: t.accentText, circleEmissiveStrength: OVERLAY_EMISSIVE }} />
      <SymbolLayer
        id="works-icon"
        slot="top"
        filter={['!', ['has', 'point_count']]}
        style={{ iconImage: ['get', 'icon'], iconSize: ['get', 'scale'], iconAllowOverlap: true, iconIgnorePlacement: true, iconOcclusionOpacity: 1, iconEmissiveStrength: OVERLAY_EMISSIVE, symbolSortKey: ['case', ['==', ['get', 'slug'], selected ?? ''], 1, 0] }}
      />
    </ShapeSource>
  );
}

/** Tek eser işareti (türü verilirse simgesiyle); konumu kesin değilse çevresinde yaklaşık alan. */
export function WorkPin({ location, approximate, typeSlug }: { location: LngLat; approximate?: boolean; typeSlug?: string }) {
  const t = useSweetTheme();
  const theme = useThemeKey();
  return (
    <ShapeSource id="work-src" shape={{ type: 'Point', coordinates: location }}>
      {approximate ? <CircleLayer id="work-area" slot="top" style={{ circleRadius: 46, circleColor: t.primaryText, circleOpacity: 0.14, circleStrokeWidth: 2, circleStrokeColor: t.primaryText, circleEmissiveStrength: OVERLAY_EMISSIVE }} /> : <></>}
      {typeSlug ? (
        <SymbolLayer id="work-icon" slot="top" style={{ iconImage: iconName(typeSlug, theme), iconSize: ICON_SCALE_SELECTED, iconAllowOverlap: true, iconIgnorePlacement: true, iconOcclusionOpacity: 1, iconEmissiveStrength: OVERLAY_EMISSIVE }} />
      ) : (
        <>
          <CircleLayer id="work-halo" slot="top" style={{ circleRadius: 16, circleColor: t.surface, circleEmissiveStrength: OVERLAY_EMISSIVE }} />
          <CircleLayer id="work-circle" slot="top" style={{ circleRadius: 9, circleColor: t.accentText, circleStrokeWidth: 3, circleStrokeColor: t.surface, circleEmissiveStrength: OVERLAY_EMISSIVE }} />
        </>
      )}
    </ShapeSource>
  );
}

/** Kullanıcı konumu: halka ve nokta. */
export function UserDot({ location }: { location: LngLat }) {
  const t = useSweetTheme();
  return (
    <ShapeSource id="me-src" shape={{ type: 'Point', coordinates: location }}>
      <CircleLayer id="me-halo" slot="top" style={{ circleRadius: 18, circleColor: t.primaryText, circleOpacity: 0.18, circleEmissiveStrength: OVERLAY_EMISSIVE }} />
      <CircleLayer id="me-dot" slot="top" style={{ circleRadius: 8, circleColor: t.primaryText, circleStrokeWidth: 3, circleStrokeColor: t.surface, circleEmissiveStrength: OVERLAY_EMISSIVE }} />
    </ShapeSource>
  );
}

/** Başlangıç ve varış işaretleri. */
export function EndPin({ id, location, kind }: { id: string; location: LngLat; kind: 'start' | 'end' }) {
  const t = useSweetTheme();
  const fill = kind === 'end' ? t.accentText : t.surface;
  const stroke = kind === 'end' ? t.surface : t.primaryText;
  return (
    <ShapeSource id={`${id}-src`} shape={{ type: 'Point', coordinates: location }}>
      <CircleLayer id={`${id}-pin`} slot="top" style={{ circleRadius: kind === 'end' ? 10 : 8, circleColor: fill, circleStrokeWidth: 3.5, circleStrokeColor: stroke, circleEmissiveStrength: OVERLAY_EMISSIVE }} />
    </ShapeSource>
  );
}
