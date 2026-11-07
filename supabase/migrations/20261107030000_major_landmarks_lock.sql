-- Büyük yer işareti sınırı yarışsız: aynı ilde eşzamanlı iki ekleme, sayımdan önce il başına işlem kilidi
-- alır. İkinci işlem birincinin bitmesini bekler; READ COMMITTED'da sayım yeni anlık görüntüyle yapılır ve
-- birincinin kaydını görür (7 kayıtken iki ekleme 9'a çıkaramaz).
create or replace function public.nav_points_major_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'verified' and 'landmark' = any(new.roles) and new.salience = 3 then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('nav_points_major:' || new.city_id::text, 0));
    if (
      select count(*) from public.nav_points p
      where p.city_id = new.city_id and p.id <> new.id and p.status = 'verified'
        and 'landmark' = any(p.roles) and p.salience = 3
    ) >= 8 then
      raise exception 'Bu ilde en çok 8 büyük yer işareti olabilir; önce birini küçültün.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
