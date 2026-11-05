import { CityRowSchema, ExhibitionRowSchema, mediaUrl, WorkRowSchema, type CityRow, type ExhibitionRow, type WorkPhoto, type WorkRow } from '@sezi/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Image } from 'expo-image';
import Storage from 'expo-sqlite/kv-store';
import { z } from 'zod';

import { supabase } from './supabase';

/**
 * Eser satırlarının cihazdaki son bilinen hâli (slug başına bir anahtar). Açılan eser sayfaları ve
 * nokta eşitlemesinin önceden çektiği, noktalara bağlı eserler burada kalır: uygulama yeniden açılıp
 * internetsiz yüründüğünde de nokta kartındaki eser bilgisi ve eser sayfası görünür.
 */
const WORK_KEY = (slug: string) => `sezi.work.v1:${slug}`;

export function cachedWork(slug: string): WorkRow | undefined {
  try {
    const raw = Storage.getItemSync(WORK_KEY(slug));
    if (!raw) return undefined;
    const parsed = WorkRowSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.slug === slug ? parsed.data : undefined;
  } catch {
    // Bozuk kayıt yok sayılır; sunucudan yeniden alınır.
    return undefined;
  }
}

function storeWork(row: WorkRow) {
  Storage.setItemSync(WORK_KEY(row.slug), JSON.stringify(row));
}

const MEDIA_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`;
/** Fotoğrafın herkese açık adresi; küçük boy istenirse ve varsa önizleme dosyası. */
export function photoUrl(p: WorkPhoto, size: 'thumb' | 'full' = 'full'): string {
  return mediaUrl(MEDIA_BASE, p, size);
}

/**
 * Verilen eserleri sunucudan çekip cihazda saklar (ör. noktalara bağlı eserler); kapak küçükleri de
 * diske indirilir. Hata sessizce atlanır; sonraki eşitlemede yeniden denenir.
 */
export async function prefetchWorks(slugs: string[]): Promise<void> {
  const want = [...new Set(slugs)];
  if (want.length === 0) return;
  try {
    const { data, error } = await supabase.from('works_view').select('*').eq('status', 'verified').in('slug', want);
    if (error || !data) return;
    const rows = z.array(WorkRowSchema).parse(data);
    for (const row of rows) storeWork(row);
    const thumbs = rows.flatMap((r) => (r.photos[0] ? [photoUrl(r.photos[0], 'thumb')] : []));
    if (thumbs.length) await Image.prefetch(thumbs, 'disk');
  } catch {
    // İnternet yok: saklı satırlar kalır.
  }
}

/**
 * Yayındaki eserlerin tamamı cihazda saklanır (`sezi.works.v1`). Açılışta son bilinen liste hemen gösterilir
 * (internetsiz de), eskiyse sunucudan arka planda yenilenir. İl listeleri aynı sorgudan süzülür: açılışta il ve
 * tüm eserler için iki ayrı (~2 MB) indirme ve doğrulama yapılmaz.
 */
const WORKS_KEY = 'sezi.works.v1';
const WorksCacheSchema = z.object({ at: z.number(), rows: z.array(WorkRowSchema) });
type WorksCache = z.infer<typeof WorksCacheSchema>;
/** Saklı liste süreç başına bir kez okunur ve doğrulanır (her bileşende yeniden ayrıştırılmaz). */
let worksSeed: WorksCache | null | undefined;
function cachedWorks(): WorksCache | null {
  if (worksSeed !== undefined) return worksSeed;
  try {
    const raw = Storage.getItemSync(WORKS_KEY);
    const parsed = raw ? WorksCacheSchema.safeParse(JSON.parse(raw)) : null;
    worksSeed = parsed?.success ? parsed.data : null;
  } catch {
    // Bozuk kayıt yok sayılır; sunucudan yeniden alınır.
    worksSeed = null;
  }
  return worksSeed;
}

export function useWorks(citySlug?: string) {
  const select = useCallback((rows: WorkRow[]) => (citySlug ? rows.filter((w) => w.city_slug === citySlug) : rows), [citySlug]);
  return useQuery({
    queryKey: ['works'],
    queryFn: async (): Promise<WorkRow[]> => {
      // Admin hesabıyla giriş yapılsa da uygulama yalnız yayındaki eseri gösterir (RLS admine taslağı da açar).
      const { data, error } = await supabase.from('works_view').select('*').eq('status', 'verified').order('slug');
      if (error) throw error;
      const rows = z.array(WorkRowSchema).parse(data);
      worksSeed = { at: Date.now(), rows };
      void Storage.setItem(WORKS_KEY, JSON.stringify(worksSeed)).catch(() => {});
      return rows;
    },
    initialData: () => cachedWorks()?.rows,
    initialDataUpdatedAt: () => cachedWorks()?.at,
    // Envanter seyrek değişir; yenileme aşağı çekerek de yapılır.
    staleTime: 30 * 60_000,
    select,
  });
}

/**
 * Tek eser. Cihazdaki son bilinen satır hemen gösterilir (internetsiz de); sunucudan yenisi gelince
 * güncellenip saklanır. Sunucuya ulaşılamazsa son bilinen satır kalır; eser yayından kalktıysa silinir.
 */
export function useWork(slug: string) {
  return useQuery({
    queryKey: ['work', slug],
    queryFn: async (): Promise<WorkRow | null> => {
      let res;
      try {
        res = await supabase.from('works_view').select('*').eq('status', 'verified').eq('slug', slug).maybeSingle();
      } catch (e) {
        res = { data: null, error: e };
      }
      if (res.error) {
        const last = cachedWork(slug);
        if (last) return last;
        throw res.error;
      }
      const row = res.data ? WorkRowSchema.parse(res.data) : null;
      if (row) storeWork(row);
      else Storage.removeItemSync(WORK_KEY(slug));
      return row;
    },
    initialData: () => (slug ? cachedWork(slug) : undefined),
    // Saklı satır eski sayılır: açılışta sunucudan yenilenir.
    initialDataUpdatedAt: 0,
    enabled: !!slug,
  });
}

const CITIES_KEY = 'sezi.cities.v1';
const CitiesCacheSchema = z.object({ at: z.number(), rows: z.array(CityRowSchema) });
function cachedCities(): z.infer<typeof CitiesCacheSchema> | undefined {
  try {
    const raw = Storage.getItemSync(CITIES_KEY);
    const parsed = raw ? CitiesCacheSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** Envanter illeri: aktif olanlar (Hatay, Konya, Bursa) ve sıradaki iller. Son bilinen liste cihazdan hemen gelir. */
export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async (): Promise<CityRow[]> => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, slug, name, is_active, sort_order, inventory_year, inventory_works, inventory_photos, inventory_status, inventory_note')
        .not('inventory_year', 'is', null)
        .order('sort_order');
      if (error) throw error;
      const rows = z.array(CityRowSchema).parse(data);
      void Storage.setItem(CITIES_KEY, JSON.stringify({ at: Date.now(), rows })).catch(() => {});
      return rows;
    },
    initialData: () => cachedCities()?.rows,
    initialDataUpdatedAt: () => cachedCities()?.at,
    staleTime: 60 * 60_000,
  });
}

export function useExhibitions() {
  return useQuery({
    queryKey: ['exhibitions'],
    queryFn: async (): Promise<ExhibitionRow[]> => {
      const { data, error } = await supabase
        .from('exhibitions')
        .select('id, slug, title, venue, starts_on, ends_on, photo_count, description, source_url, city:cities(slug, name)')
        .eq('status', 'verified')
        .order('starts_on', { ascending: false });
      if (error) throw error;
      return z.array(ExhibitionRowSchema).parse(data);
    },
    staleTime: 60 * 60_000,
  });
}

const InventoryBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  year: z.number().nullable(),
  url: z.string().nullable(),
  volume: z.number().nullable(),
  city_id: z.string().nullable(),
});
export type InventoryBook = z.infer<typeof InventoryBookSchema>;

export function useInventoryBooks() {
  return useQuery({
    queryKey: ['inventory-books'],
    queryFn: async (): Promise<InventoryBook[]> => {
      const { data, error } = await supabase.from('sources').select('id, title, year, url, volume, city_id').eq('kind', 'inventory').order('title');
      if (error) throw error;
      return z.array(InventoryBookSchema).parse(data);
    },
    staleTime: 60 * 60_000,
  });
}
