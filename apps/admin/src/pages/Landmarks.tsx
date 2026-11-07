import { footprintsByWork, isMajorLandmark, MAJOR_LANDMARK_LIMIT, MAJOR_LANDMARK_SALIENCE, PilotBuildingsSchema } from '@sezi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, CircleAlert, Landmark, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tr, useLookups, usePoints, type PointRow } from '@/lib/data';
import { PILOT_CITY, pilotPlanner } from '@/lib/pilot';
import { supabase } from '@/lib/supabase';

import buildings from '../../../mobile/assets/pilot/bursa-hanlar-buildings.json';

/** Pilot alan eserlerinin bina tabanı (OSM; `data/build_buildings.py`, mobil uygulamayla aynı dosya). */
const FOOTPRINTS = footprintsByWork(PilotBuildingsSchema.parse(buildings));

/** Adaylar: pilot alan eserleri, bina tabanı büyükten küçüğe (binası eşleşmeyen sonda). */
const CANDIDATES = pilotPlanner.pilotWorks
  .map((n) => ({ slug: n.workSlug!, name: n.name?.tr ?? n.workSlug!, footprint: FOOTPRINTS.get(n.workSlug!) }))
  .sort((a, b) => (b.footprint?.areaM2 ?? -1) - (a.footprint?.areaM2 ?? -1) || a.name.localeCompare(b.name, 'tr'));

/** Bu taban alanından büyük eser "çok büyük yapı" sayılır (önerilir; seçim admin'in). */
const SUGGEST_M2 = 2000;

const m2 = (n: number) => `${Math.round(n / 10) * 10} m²`;
const message = (e: unknown) => (typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e));

/**
 * Büyük yer işaretleri (Kevin Lynch, landmark): uzaktan seçilen ve yön bulmaya dayanak olan çok büyük yapılar.
 * Uygulama haritasında altın rozetle çizilir, binası vurgulanır, talimatta adıyla anılır. Az olmalı: il başına en
 * çok MAJOR_LANDMARK_LIMIT (veritabanı da korur). Kayıt bir yer işareti noktasıdır (`nav_points`, belirginlik 3);
 * ayrıntısı Noktalar sayfasında düzenlenir.
 */
export function Landmarks() {
  const qc = useQueryClient();
  const { data: lookups } = useLookups();
  const { data: points = [], isLoading, error } = usePoints(PILOT_CITY);
  const cityId = lookups?.cities.find((c) => c.slug === PILOT_CITY)?.id;

  const majors = useMemo(
    () =>
      points
        .filter((p) => p.status === 'verified' && isMajorLandmark({ roles: p.roles, salience: p.salience ?? undefined }))
        .sort((a, b) => (FOOTPRINTS.get(b.work_slug ?? '')?.areaM2 ?? 0) - (FOOTPRINTS.get(a.work_slug ?? '')?.areaM2 ?? 0)),
    [points],
  );
  const majorWorks = new Set(majors.flatMap((p) => (p.work_slug ? [p.work_slug] : [])));
  const full = majors.length >= MAJOR_LANDMARK_LIMIT;

  // Eser kimliği ve konumu: yeni nokta eserin kendi konumuna konur.
  const { data: works } = useQuery({
    queryKey: ['landmark-works'],
    queryFn: async () => {
      const { data, error: e } = await supabase.from('works_view').select('id, slug, name, lng, lat').in('slug', CANDIDATES.map((c) => c.slug));
      if (e) throw e;
      return new Map((data as { id: string; slug: string; name: { tr: string; en?: string }; lng: number | null; lat: number | null }[]).map((w) => [w.slug, w]));
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['nav_points', PILOT_CITY] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const promote = useMutation({
    mutationFn: async (slug: string) => {
      const w = works?.get(slug);
      if (!w || w.lng == null || w.lat == null) throw new Error('Eserin konumu bulunamadı.');
      if (!cityId) throw new Error('İl bulunamadı.');
      const fp = FOOTPRINTS.get(slug);
      const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      const { error: e } = await supabase.from('nav_points').insert({
        city_id: cityId,
        title: w.name,
        roles: ['landmark'],
        location: `SRID=4326;POINT(${w.lng} ${w.lat})`,
        salience: MAJOR_LANDMARK_SALIENCE,
        work_id: w.id,
        source_note: `Büyük yer işareti (Lynch): ${fp ? `OpenStreetMap bina tabanı yaklaşık ${m2(fp.areaM2)} (ODbL; data/build_buildings.py). ` : ''}Seçim: admin paneli, ${date}.`,
        status: 'verified',
        radius_m: 25,
      });
      if (e) throw e;
    },
    onSuccess: () => {
      toast.success('Büyük yer işareti eklendi');
      refresh();
    },
    onError: (e) => toast.error(message(e)),
  });

  // Küçültmek noktayı silmez: yerel yer işareti olarak talimatta anılmaya devam eder, haritada öne çıkmaz.
  const demote = useMutation({
    mutationFn: async (p: PointRow) => {
      const { error: e } = await supabase.from('nav_points').update({ salience: 2 }).eq('id', p.id);
      if (e) throw e;
    },
    onSuccess: () => {
      toast.success('Yerel yer işaretine çevrildi');
      refresh();
    },
    onError: (e) => toast.error(message(e)),
  });

  const busy = promote.isPending || demote.isPending;

  return (
    <>
      <PageHeader />

      {error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Noktalar alınamadı</AlertTitle>
          <AlertDescription>{message(error)}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Haritadaki büyük yer işaretleri
            <Badge variant={full ? 'warning' : 'secondary'} className="num">
              {majors.length} / {MAJOR_LANDMARK_LIMIT}
            </Badge>
          </CardTitle>
          <CardDescription>
            Uzaktan görülen ve insanların yön bulduğu çok büyük yapılar. Uygulamada altın rozetle çizilir, binası vurgulanır, talimatta adıyla anılır. Az olsun: en çok {MAJOR_LANDMARK_LIMIT}. Küçültülen nokta silinmez, yerel yer işareti olarak talimatta anılmaya devam eder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : majors.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Landmark />
                </EmptyMedia>
                <EmptyTitle>Büyük yer işareti yok</EmptyTitle>
                <EmptyDescription>Aşağıdaki listeden en büyük yapıları seçin.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Bağlı eser</TableHead>
                  <TableHead className="text-right">Bina tabanı</TableHead>
                  <TableHead>
                    <span className="sr-only">İşlem</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {majors.map((p) => {
                  const fp = p.work_slug ? FOOTPRINTS.get(p.work_slug) : undefined;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{tr(p.title)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.work_slug ? (CANDIDATES.find((c) => c.slug === p.work_slug)?.name ?? p.work_slug) : 'Eser değil'}</TableCell>
                      <TableCell className="num text-right">{fp ? m2(fp.areaM2) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" className="min-h-12" disabled={busy} onClick={() => demote.mutate(p)}>
                          <ArrowDownToLine data-icon="inline-start" />
                          Küçült
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aday eserler</CardTitle>
          <CardDescription>
            Pilot alandaki eserler, OpenStreetMap bina tabanına göre büyükten küçüğe. {m2(SUGGEST_M2)} üstü "çok büyük yapı" olarak önerilir; kule gibi eser olmayan yapıları Noktalar sayfasında belirginlik 3 ile ekleyin.
          </CardDescription>
          {full ? (
            <CardAction>
              <Badge variant="warning">Sınır dolu: önce birini küçültün</Badge>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Eser</TableHead>
                <TableHead className="text-right">Bina tabanı</TableHead>
                <TableHead className="text-right">Yükseklik</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>
                  <span className="sr-only">İşlem</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CANDIDATES.map((c) => {
                const isMajor = majorWorks.has(c.slug);
                const suggested = (c.footprint?.areaM2 ?? 0) >= SUGGEST_M2;
                return (
                  <TableRow key={c.slug}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="num text-right">{c.footprint ? m2(c.footprint.areaM2) : 'Bina yok'}</TableCell>
                    <TableCell className="num text-right">{c.footprint ? `${Math.round(c.footprint.heightM)} m` : '—'}</TableCell>
                    <TableCell>
                      {isMajor ? <Badge variant="success">Büyük yer işareti</Badge> : suggested ? <Badge variant="outline">Önerilen</Badge> : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {isMajor ? null : (
                        <Button
                          type="button"
                          variant={suggested ? 'default' : 'outline'}
                          className="min-h-12"
                          disabled={busy || full || !works}
                          aria-label={`${c.name}: büyük yer işareti yap`}
                          onClick={() => promote.mutate(c.slug)}
                        >
                          <Plus data-icon="inline-start" />
                          Yer işareti yap
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
