# Sezi mobil uygulaması

Expo SDK 57, React Native 0.86 (New Architecture), Expo Router. Uygulama native modüller kullandığı için (Mapbox, react-native-audio-api, react-native-svg) **Expo Go ile açılmaz**; Android development build gerekir.

Kurulum ayrıntıları: [KURULUM.md](../../KURULUM.md#5-mobil-uygulama-geliştirme). Ekranlar ve veri akışı: [docs/MIMARI.md](../../docs/MIMARI.md).

## Çalıştırma

```bash
cp ../../.env.example .env          # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY, EXPO_PUBLIC_MAPBOX_TOKEN
npx expo run:android                # ilk kurulum ya da native modül değişikliği (~10 dk)
npx expo start --dev-client         # sonraki JS değişiklikleri
npx tsc --noEmit                    # tip denetimi
npx expo lint                       # lint
```

Emülatör ya da telefon Metro'ya bağlanamazsa:

```bash
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d "exp+sezi://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
```

## Klasörler

```
src/app/          ekranlar (Expo Router); stack kayıtları _layout.tsx'te
src/components/   ortak bileşenler: ui.tsx (Button, Card, ListRow…), text.tsx, map/ (Mapbox sarmalayıcısı)
src/design/       tipografi (type.ts), tema bileşenleri ve hareket token'ları (sweet/), ikonlar
src/lib/          veri (works), rota ve rehberlik (nav, navigation/, tours), profil ve ayarlar, i18n ve metinler (messages-app)
assets/pilot/     gömülü pilot yol ağı (data/build_nav_graph.py üretir)
assets/voice/     gömülü sabit yönlendirme sesleri (scripts/gen-voice-bundle.mts üretir)
```

## Kurallar

- **Metinler:** Ekranda sabit metin yazılmaz. Her metin `src/lib/messages-app.ts` dosyasına Türkçe ve İngilizce birlikte eklenir.
- **Yazı:** `react-native` yerine `@/components/text` içindeki `Text` kullanılır; uygulama içi yazı boyutu ayarı bununla çalışır (lint kuralıyla korunur).
- **Renk:** Yalnızca `useSweetTheme()` token'ları kullanılır. Temalar ve kontrast testleri `packages/shared/src/sweet-theme.ts` içindedir.
- **Harita:** Ekranlar Mapbox'ı doğrudan kullanmaz, `src/components/map` bileşenlerini kullanır.
- **Erişilebilirlik:** Her etkileşimli öğede `accessibilityRole` ve etiket olur, dokunma alanı en az 48 dp'dir, her ses ipucunun görsel ve haptik karşılığı vardır.

## Gerçek telefonda test listesi

Kulaklık takılı olsun.

1. **Lab:** "Sol" ve "Sağ" tonları doğru kulaktan geliyor, pusula yönü değişiyor, titreşimler hissediliyor.
2. **Turlar → "Ulu Cami ve Hanlar Bölgesi" → ilk durağa yol tarifi → simülasyon:**
   - Talimatlar okunuyor.
   - Sağa dönüşte çift, sola dönüşte tek titreşim var.
   - Yer işareti tonu doğru yönden geliyor.
3. **Profil → düzenle → işitme "Duymuyorum":** Simülasyonda ses yok; ekran kenarı parlıyor ve titreşim var. Eser sayfasında anlatım metni görünüyor.
4. **Keşfet:** İl değiştirince harita ve liste değişiyor. Konumu kesin olmayan eserde konum kesinliği belirtiliyor.
