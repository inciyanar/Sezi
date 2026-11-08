import { CATEGORY_ART_FILES, categoryArtFile, glyphSvgBody, glyphType, GLYPH_TYPES, toneForType, type CategoryArtFile, type SweetTheme } from "@sezi/shared";
import type { Map as MapboxMap } from "mapbox-gl";
import type { StaticImageData } from "next/image";

// Mobil uygulamanın çizimleri: tek kaynak, kopya dosya yok (Next derlemede /_next/static/media altına alır).
import cami from "../../../../mobile/assets/categories/cami.webp";
import carsiVeBedesten from "../../../../mobile/assets/categories/carsi-ve-bedesten.webp";
import cesme from "../../../../mobile/assets/categories/cesme.webp";
import darussifa from "../../../../mobile/assets/categories/darussifa.webp";
import hamam from "../../../../mobile/assets/categories/hamam.webp";
import han from "../../../../mobile/assets/categories/han.webp";
import hazireVeMezarlik from "../../../../mobile/assets/categories/hazire-ve-mezarlik.webp";
import imaret from "../../../../mobile/assets/categories/imaret.webp";
import kervansaray from "../../../../mobile/assets/categories/kervansaray.webp";
import kilise from "../../../../mobile/assets/categories/kilise.webp";
import konakVeEv from "../../../../mobile/assets/categories/konak-ve-ev.webp";
import kopru from "../../../../mobile/assets/categories/kopru.webp";
import medrese from "../../../../mobile/assets/categories/medrese.webp";
import mektep from "../../../../mobile/assets/categories/mektep.webp";
import tekkeVeZaviye from "../../../../mobile/assets/categories/tekke-ve-zaviye.webp";
import turbe from "../../../../mobile/assets/categories/turbe.webp";
import landmarkArt from "../../../../mobile/assets/images/landmark.png";

const ART: Record<CategoryArtFile, StaticImageData> = {
  cami, medrese, turbe, cesme, hamam, han, imaret, kervansaray, kilise, kopru, mektep, darussifa,
  "carsi-ve-bedesten": carsiVeBedesten, "konak-ve-ev": konakVeEv, "hazire-ve-mezarlik": hazireVeMezarlik, "tekke-ve-zaviye": tekkeVeZaviye,
};

/** Simge anahtarı: çizimi olan tür çizim dosyasının adıyla (kısa ve uzun slug tek resmi paylaşır), yoksa glif türüyle. */
const typeKey = (slug: string) => categoryArtFile(slug) ?? glyphType(slug);
export const iconName = (slug: string) => `type-${typeKey(slug)}`;
export const LANDMARK_ICON = "major-landmark";

/** Mobil haritayla aynı ölçüler (dp = css px). */
const ICON_SIZE = 36;
const LANDMARK_SIZE = 56;
const RATIO = 2;

async function load(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size * RATIO;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d canvas yok");
  ctx.scale(RATIO, RATIO);
  return { c, ctx };
}

function ring(ctx: CanvasRenderingContext2D, size: number, r: number, fill: string | null, stroke: string, width: number) {
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function add(m: MapboxMap, name: string, c: HTMLCanvasElement) {
  const ctx = c.getContext("2d");
  if (!ctx || m.hasImage(name)) return;
  m.addImage(name, ctx.getImageData(0, 0, c.width, c.height), { pixelRatio: RATIO });
}

/**
 * Eser türü simgeleri (mobil haritayla aynı): yüzey dolgulu daire, mürekkep dış kasa, tür mürekkebinde iç halka
 * ve içinde renkli kategori çizimi. Çizimi olmayan türde tek renk glif. Her resim bir kez eklenir.
 */
async function addTypeIcons(m: MapboxMap, th: SweetTheme) {
  const keys = [...new Set([...GLYPH_TYPES.map(typeKey), ...CATEGORY_ART_FILES])];
  await Promise.all(
    keys.map(async (key) => {
      const ink = th.tones[toneForType(key)].ink;
      const file = categoryArtFile(key);
      const art = await load(
        file ? ART[file].src : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">${glyphSvgBody(key, ink)}</svg>`)}`,
      );
      const { c, ctx } = canvas(ICON_SIZE);
      ring(ctx, ICON_SIZE, ICON_SIZE / 2 - 1.25, th.surface, th.text, 2.5);
      ring(ctx, ICON_SIZE, 13, null, ink, 2);
      const s = file ? 24 : 19;
      ctx.drawImage(art, (ICON_SIZE - s) / 2, (ICON_SIZE - s) / 2, s, s);
      add(m, iconName(key), c);
    }),
  );
}

/** Büyük yer işareti rozeti: altın dolgu, kalın mürekkep kasa, ortada tasarımcının yer işareti çizimi altın mürekkebinde. */
async function addLandmarkIcon(m: MapboxMap, th: SweetTheme) {
  const art = await load(landmarkArt.src);
  // Siyah çizim oranı korunarak 34 px kareye oturur ve altın mürekkebine boyanır (renk token'dan).
  const w = 34 * Math.min(1, art.naturalWidth / art.naturalHeight);
  const h = 34 * Math.min(1, art.naturalHeight / art.naturalWidth);
  const tint = canvas(34);
  tint.ctx.drawImage(art, (34 - w) / 2, (34 - h) / 2, w, h);
  tint.ctx.globalCompositeOperation = "source-in";
  tint.ctx.fillStyle = th.gold.ink;
  tint.ctx.fillRect(0, 0, 34, 34);
  const { c, ctx } = canvas(LANDMARK_SIZE);
  ring(ctx, LANDMARK_SIZE, LANDMARK_SIZE / 2 - 1.5, th.gold.fill, th.text, 3);
  ctx.drawImage(tint.c, (LANDMARK_SIZE - 34) / 2, (LANDMARK_SIZE - 34) / 2, 34, 34);
  add(m, LANDMARK_ICON, c);
}

export const addMapIcons = (m: MapboxMap, th: SweetTheme) => Promise.all([addTypeIcons(m, th), addLandmarkIcon(m, th)]);
