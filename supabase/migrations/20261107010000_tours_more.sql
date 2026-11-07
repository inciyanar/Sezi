-- Ek turlar (Bursa pilot alanı): 5 → 14 tur. Pilot grafikteki 36 eserin hepsi en az bir turda yer alır.
-- Açıklamalar yalnız durakları sayar; tarihî bilgi içermez (kural 3). Sıra uygulamada hesaplanır (fixed_order = false).
-- Yaya ağında (yürüyen profil) uzunluklar ~0,6–3,4 km; tekerlekli sandalye profilinde bütün duraklar basamaksız ulaşılır.
insert into public.tours (slug, city_id, title, body, stops, sort_order, status)
select v.slug, c.id, v.title::jsonb, v.body::jsonb, v.stops::text[], v.sort_order, 'verified'
from public.cities c
cross join (values
  ('kisa-carsi',
   '{"tr":"Kısa çarşı turu","en":"A short bazaar walk"}',
   '{"tr":"Ulucami, Emir Hanı, Yıldırım Bayezid Bedesteni, Geyve Hanı ve Koza Hanı.","en":"The Grand Mosque, Emir Han, Yıldırım Bayezid Bedesten, Geyve Han and Koza Han."}',
   '{bursa-ulucami,bursa-emir-hani,bursa-yildirim-bayezid-bedesteni,bursa-geyve-hani,bursa-koza-hani}',
   6),
  ('bes-turde-bes-eser',
   '{"tr":"Beş türde beş eser","en":"Five works, five types"}',
   '{"tr":"Bir cami, bir han, bir bedesten, bir medrese, bir türbe: Ulucami, Koza Hanı, Yıldırım Bayezid Bedesteni, Haraççıoğlu Medresesi ve Osman Gazi Türbesi.","en":"A mosque, an inn, a bedesten, a madrasa and a tomb: the Grand Mosque, Koza Han, Yıldırım Bayezid Bedesten, Haraççıoğlu Madrasa and Osman Gazi Tomb."}',
   '{bursa-ulucami,bursa-koza-hani,bursa-yildirim-bayezid-bedesteni,bursa-haraccioglu-medresesi,bursa-osman-gazi-turbesi}',
   7),
  ('batiya-dogru',
   '{"tr":"Batıya doğru","en":"Heading west"}',
   '{"tr":"İpek Hanı ve Pirinç Hanı''ndan Okçu Baba Türbesi''ne, Veled-i Yaniç ve Kavaklı camilerine, Haraççıoğlu Medresesi''ne.","en":"From İpek Han and Pirinç Han to Okçu Baba Tomb, the Veled-i Yaniç and Kavaklı mosques and Haraççıoğlu Madrasa."}',
   '{bursa-ipek-hani,bursa-pirinc-hani,bursa-okcu-baba-turbesi,bursa-veled-i-yanic-camii-cesme-ve-haziresi,bursa-kavakli-camii,bursa-haraccioglu-medresesi}',
   8),
  ('sehrekustu-yolu',
   '{"tr":"Şehreküstü yolu","en":"The Şehreküstü walk"}',
   '{"tr":"İpek Hanı''ndan Ertuğrul Bey, Şehreküstü (Pars Bey), Yeni Bezzâz ve Acemler camilerine, Bekir Dede Türbesi''ne.","en":"From İpek Han to the Ertuğrul Bey, Şehreküstü (Pars Bey), Yeni Bezzâz and Acemler mosques and Bekir Dede Tomb."}',
   '{bursa-ipek-hani,bursa-ertugrul-bey-camii-ve-kabri,bursa-sehrekustu-pars-bey-camii,bursa-yeni-bezzaz-reyhan-camii,bursa-acemler-camii,bursa-bekir-dede-turbesi}',
   9),
  ('guney-sokaklari',
   '{"tr":"Güney sokakları","en":"Southern streets"}',
   '{"tr":"Ulucami''den Hacı Ali Sevinç, Arap Mehmet, Veled-i Habib, Veli Şemseddin ve Nalbantoğlu camilerine.","en":"From the Grand Mosque to the Hacı Ali Sevinç, Arap Mehmet, Veled-i Habib, Veli Şemseddin and Nalbantoğlu mosques."}',
   '{bursa-ulucami,bursa-haci-ali-sevinc-camii,bursa-arap-mehmet-camii,bursa-veled-i-habib-camii,bursa-veli-semseddin-yahni-kapan-camii-ve-haziresi,bursa-nalbantoglu-camii}',
   10),
  ('hazireli-camiler',
   '{"tr":"Hazireli camiler","en":"Mosques with graveyards"}',
   '{"tr":"Haziresiyle birlikte kayıtlı beş cami: Veled-i Veziri, Ali Paşa, Araplar, Veli Şemseddin (Yahni Kapan) ve Akbıyık.","en":"Five mosques recorded together with their graveyards: Veled-i Veziri, Ali Paşa, Araplar, Veli Şemseddin (Yahni Kapan) and Akbıyık."}',
   '{bursa-veled-i-veziri-camii-ve-haziresi,bursa-ali-pasa-camii-ve-haziresi,bursa-araplar-camii-ve-haziresi,bursa-veli-semseddin-yahni-kapan-camii-ve-haziresi,bursa-akbiyik-camii-ve-haziresi}',
   11),
  ('dogu-mahalleleri',
   '{"tr":"Doğu mahalleleri","en":"Eastern neighbourhoods"}',
   '{"tr":"Orhan Bey Camii''nden Nalbantoğlu, Hacılar, Karakâdî ve Hayrettin Paşa camilerine, Abdal Mehmed Türbesi''ne.","en":"From Orhan Bey Mosque to the Nalbantoğlu, Hacılar, Karakâdî and Hayrettin Paşa mosques and Abdal Mehmed Tomb."}',
   '{bursa-orhan-bey-camii,bursa-nalbantoglu-camii,bursa-hacilar-camii,bursa-karakadi-camii-ve-haziresi,bursa-hayrettin-pasa-camii,bursa-abdal-mehmed-turbesi}',
   12),
  ('alandaki-turbeler',
   '{"tr":"Alandaki türbeler","en":"The tombs of the area"}',
   '{"tr":"Pilot alandaki beş türbe: Osman Gazi, Orhan Gazi, Okçu Baba, Bekir Dede ve Abdal Mehmed.","en":"The five tombs in the pilot area: Osman Gazi, Orhan Gazi, Okçu Baba, Bekir Dede and Abdal Mehmed."}',
   '{bursa-osman-gazi-turbesi,bursa-orhan-gazi-turbesi,bursa-okcu-baba-turbesi,bursa-bekir-dede-turbesi,bursa-abdal-mehmed-turbesi}',
   13),
  ('dort-yon',
   '{"tr":"Dört yön","en":"Four directions"}',
   '{"tr":"Alanın en uzun turu: Ulucami''den batıda Kavaklı, kuzeyde Acemler, doğuda Karakâdî ve güneyde Veled-i Habib camilerine.","en":"The longest tour of the area: from the Grand Mosque to Kavaklı in the west, Acemler in the north, Karakâdî in the east and Veled-i Habib in the south."}',
   '{bursa-ulucami,bursa-kavakli-camii,bursa-acemler-camii,bursa-karakadi-camii-ve-haziresi,bursa-veled-i-habib-camii}',
   14)
) as v(slug, title, body, stops, sort_order)
where c.slug = 'bursa'
on conflict (slug) do nothing;
