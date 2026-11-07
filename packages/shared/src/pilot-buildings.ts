import { z } from "zod";

/**
 * Pilot alan binaları (`data/build_buildings.py` üretir, `apps/mobile/assets/pilot/*-buildings.json`):
 * Lynch bölgesi (pilot alan çokgeni) ve yer işareti binaları. Mobil ve web haritası aynı dosyayı çizer.
 * Bina özellikleri: `w` eser slug'ı, `t` eser türü, `h` blok yüksekliği (m), `b` taban yüksekliği (m).
 */
const Ring = z.array(z.tuple([z.number(), z.number()]));

export const PilotBuildingsSchema = z.object({
  district: z.object({ polygon: z.array(Ring) }).nullable(),
  landmarks: z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        properties: z.object({ w: z.string(), t: z.string(), h: z.number(), b: z.number() }),
        geometry: z.object({ type: z.literal("Polygon"), coordinates: z.array(Ring) }),
      }),
    ),
  }),
});
export type PilotBuildings = z.infer<typeof PilotBuildingsSchema>;

/** Halkanın yaklaşık alanı (m², yerel düzlem). */
function ringArea(ring: readonly (readonly [number, number])[]): number {
  if (ring.length < 3) return 0;
  const kx = 111_320 * Math.cos((ring[0]![1] * Math.PI) / 180);
  const ky = 110_540;
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    sum += x1 * kx * (y2 * ky) - x2 * kx * (y1 * ky);
  }
  return Math.abs(sum) / 2;
}

/**
 * Eser başına bina taban alanı (m², avlu boşlukları düşülür) ve en yüksek blok (m). Büyük yer işareti adayları
 * bununla sıralanır: Lynch'in yer işareti uzaktan seçilen, çevresinden belirgin büyük yapıdır.
 */
export function footprintsByWork(buildings: PilotBuildings): Map<string, { areaM2: number; heightM: number }> {
  const out = new Map<string, { areaM2: number; heightM: number }>();
  for (const f of buildings.landmarks.features) {
    const [outer, ...holes] = f.geometry.coordinates;
    const area = ringArea(outer ?? []) - holes.reduce((s, h) => s + ringArea(h), 0);
    const cur = out.get(f.properties.w) ?? { areaM2: 0, heightM: 0 };
    out.set(f.properties.w, { areaM2: cur.areaM2 + area, heightM: Math.max(cur.heightM, f.properties.h) });
  }
  return out;
}

/** Yer işareti bloğu yarı saydam (altındaki Mapbox binası seçilsin); eğik bakış açısı (derece). */
export const LANDMARK_OPACITY = 0.6;
export const MAP_PITCH = 45;
/** Bloklar bu yakınlıktan itibaren yükselir (14'te düz, 15,2'de tam yükseklik). */
export const LANDMARK_MIN_ZOOM = 14;
export const LANDMARK_FULL_ZOOM = 15.2;
