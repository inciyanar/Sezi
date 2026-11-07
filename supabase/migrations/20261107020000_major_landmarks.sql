-- Büyük yer işaretleri (Lynch landmark): rolü 'landmark' ve belirginliği 3 olan yayındaki nokta.
-- Uzaktan seçilen çok büyük yapılar içindir; uygulama haritasında belirgin simgeyle çizilir. Az ve seçici kalsın
-- diye il başına en çok 8 (packages/shared MAJOR_LANDMARK_LIMIT ile aynı). Belirginliği 1–2 olanlar yerel kalır:
-- talimatta anılır, ses verir, haritada öne çıkmaz. Eserler artık kendiliğinden yer işareti değildir.

create function public.nav_points_major_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'verified' and 'landmark' = any(new.roles) and new.salience = 3 and (
    select count(*) from public.nav_points p
    where p.city_id = new.city_id and p.id <> new.id and p.status = 'verified'
      and 'landmark' = any(p.roles) and p.salience = 3
  ) >= 8 then
    raise exception 'Bu ilde en çok 8 büyük yer işareti olabilir; önce birini küçültün.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger nav_points_major_limit before insert or update on public.nav_points
  for each row execute function public.nav_points_major_limit();

-- Heykel bir anıt, Kent Müzesi Heykel'in hemen yanında: ikisi de yerel yer işareti olarak kalır (başlangıç rolü değişmez).
update public.nav_points set salience = 2
where title->>'tr' in ('Heykel', 'Bursa Kent Müzesi') and 'landmark' = any(roles) and salience = 3;

-- Pilot alanın en büyük altı yapısı (OSM bina tabanı ≥ 2000 m²; sonraki yapı Emir Hanı ~1700 m²).
-- Tophane Saat Kulesi ve Zafer Plaza mevcut büyük yer işaretleri olarak kalır: toplam 8.
insert into public.nav_points (city_id, title, roles, location, salience, work_id, source_note, status, radius_m)
select w.city_id, w.name, '{landmark}', w.location, 3, w.id,
  'Büyük yer işareti (Lynch): pilot alanın en büyük yapılarından, OpenStreetMap bina tabanı yaklaşık ' || v.area
    || ' m² (ODbL; data/build_buildings.py). Seçim: ekip, 7 Kasım 2026.',
  'verified', 25
from public.works w
join (values
  ('bursa-ulucami', 4460),
  ('bursa-pirinc-hani', 3470),
  ('bursa-yildirim-bayezid-bedesteni', 3440),
  ('bursa-koza-hani', 3360),
  ('bursa-fidan-hani', 2870),
  ('bursa-ipek-hani', 2500)
) as v(slug, area) on v.slug = w.slug
where not exists (
  select 1 from public.nav_points p where p.work_id = w.id and 'landmark' = any(p.roles) and p.salience = 3
);
