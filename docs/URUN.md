# Ürün

## Platform

Sezi, Android ve web üzerinde çalışan bir kültürel miras keşif ve erişilebilir yönlendirme ürünüdür. Mobil uygulama Expo ve React Native ile geliştirilir; web sitesi `apps/web` altında yer alır.

## Kullanıcılar

Sezi, vakıf eserlerini (cami, medrese, sebil, han, hamam, türbe ve diğer yapılar) yerinde gezen ziyaretçilere yöneliktir. Görme, işitme ve hareket farklılıkları ürün tasarımının merkezindedir. Kullanıcılar eserleri keşfedebilir, kaynaklı içerikleri inceleyebilir ve erişilebilirlik profillerine uygun yönlendirmeden yararlanabilir.

## Ürünün amacı

Sezi, vakıf mirasını yalnızca koordinatlarla gösteren bir harita yerine, yer işaretleri ve mekânsal bağlamla desteklenen keşif ve yönlendirme sunar. Kullanıcıların eserleri bulmasına, külliyelerin parçalarını birlikte keşfetmesine ve kaynaklı bilgiye erişmesine yardımcı olur.

## Konumlandırma

Yönlendirme talimatları karar noktaları ve yer işaretleriyle ilişkilendirilir; rota, profilin gereksinimlerine göre hesaplanır. Harita ve metin/sesli talimatlar, görsel ve titreşimli ipuçlarıyla desteklenir. Uygulama simülasyon ve çevrimdışı kullanılabilen pilot rota verisi de içerir.

## Kapsam ve çalışma bağlamı

- İçerik kapsamındaki iller Hatay, Konya ve Bursa'dır; yeni iller sisteme eklenebilir.
- Pilot yönlendirme alanı Bursa Ulu Cami ve Hanlar Bölgesi'dir.
- Erişilebilirlik profilleri görme, işitme ve hareket tercihlerini kapsar.
- Eser içeriği yönetim panelinden düzenlenir ve yayımlanır; topluluk erişilebilirlik bildirimleri moderasyondan geçer.
- Uygulamanın kapsamı ve bileşenleri için [Mimari](MIMARI.md) ve [Nasıl çalışır?](NASIL-CALISIR.md) belgelerine bakın.

## Yetenekler

- Expo ve React Native tabanlı Android uygulaması; ayrıca Next.js web sitesi ve yönetim paneli.
- Keşif, il ve eser sayfaları, turlar, rota planlama ve canlı rehberlik, simülasyon, Sezi'ye Sor, sergiler ve profil özellikleri.
- Mapbox tabanlı haritalar.
- Türkçe ve İngilizce arayüz/içerik.
- Yayımlanmamış veya doğrulanmamış eser içeriği halka açık arayüzlerde gösterilmez; tarihî içerik kaynaklandırılır.

## Marka ve görsel dil

- Ürün adı: **Sezi**.
- Mobil uygulamanın görsel dili sıcak kırık beyaz zemin, koyu metin ve pastel firuze ana rengi üzerine kuruludur.
- Başlıklarda Nunito; okuma metni ve yön talimatlarında Atkinson Hyperlegible Next kullanılır.
- Tasarım ilkeleri ve bileşen kararları [Tasarım sistemi](TASARIM.md) belgesindedir.

## İçerik ve kaynaklar

- Eser envanteri kitaplarından ad, konum kapsamı, tür ve kaynak künyesi gibi olgusal alanlar kullanılır.
- Kitaplardan çıkarılan metinler inceleme ve yayımlama öncesinde taslak olarak tutulur.
- Eser fotoğrafları ve saha/ziyaret bilgileri kaynak ve gerekli atıf bilgileriyle yayımlanır.
- Kaynaksız tarihî bilgi üretilmez. Envanter kapsamına ilişkin ayrıntılar [Envanter](ENVANTER.md) belgesindedir.

## Ürün ilkeleri

1. Erişilebilirlik, temel kullanıcı akışlarının bir parçasıdır.
2. Kaynaklandırma ve doğrulama içerik yayımlamanın parçasıdır.
3. Yönlendirme, haritanın yanı sıra mekânsal ipuçlarından yararlanır.
4. Pilot rota verisi cihazda bulunduğunda rota hesabı çevrimdışı yapılabilir.
