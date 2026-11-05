/** Ana sayfa: TR + EN. Az yazı; sayfa doğrudan içerikle açılır. */
export const tr = {
  "home.searchLabel": "Eser ara",
  "home.searchPlaceholder": "Eser, tür ya da ilçe",
  "home.routeTitle": "Bursa Hanlar Bölgesi'nde yürü",
  "home.routeBody": "Profiline uygun yürüyüş rotası.",
  "home.routeCta": "Rota planla",
  "home.nearTitle": "Yakınında",
  "home.nearPrompt": "Sana en yakın vakıf eserlerini gör. Konumun kaydedilmez.",
  "home.nearUse": "Konumumu kullan",
  "home.nearLocating": "Konum alınıyor",
  "home.nearDenied": "Konum izni verilmedi. Tarayıcı ayarlarından izin verip yeniden dene.",
  "home.nearError": "Konum alınamadı. Yeniden dene.",
  "home.nearDistance": "{d} uzakta",
  "home.mapLabel": "İl seç",
  "home.mapCity": "{name}, {n} eser",
};

export const en: Record<keyof typeof tr, string> = {
  "home.searchLabel": "Search works",
  "home.searchPlaceholder": "Work, type or district",
  "home.routeTitle": "Walk Bursa's Inns District",
  "home.routeBody": "A walking route that fits your profile.",
  "home.routeCta": "Plan a route",
  "home.nearTitle": "Near you",
  "home.nearPrompt": "See the foundation works closest to you. Your location is not stored.",
  "home.nearUse": "Use my location",
  "home.nearLocating": "Finding your location",
  "home.nearDenied": "Location permission was not given. Allow it in your browser settings and try again.",
  "home.nearError": "Could not get your location. Try again.",
  "home.nearDistance": "{d} away",
  "home.mapLabel": "Choose a province",
  "home.mapCity": "{name}, {n} works",
};

/** Tanıtım sayfasının editoryal metinleri. */
export const homeCopy = {
  tr: {
    hero: "Kayıp değilsin, _henüz sezmedin._", curve: "kayıp değilsin… henüz sezmedin · görerek, duyarak, dokunarak ·",
    intro: "Vakıf eserlerini kendi duyularınla, kendi ritminde keşfet.", search: "Ne sezmek istersin?", searchButton: "Ara",
    works: "eser", cities: "il", senses: "algı yolu", sensesDetail: "gör, duy, dokun",
    trust: "Sezi'ne güven", manifesto: "Her kubbenin altında bir _hikâye_, her taşın ardında bir iyilik var.",
    manifestoBody: "Sezi, vakıf eserlerinin hikâyelerini herkes için erişilebilir kılar. Görerek, duyarak ve dokunarak kendi yolunu bul.",
    provinces: "İlleri keşfet", tours: "tur", weekly: "Haftanın eseri", location: "Konum", type: "Tür", access: "Erişim", stepFree: "Basamaksız giriş", ramp: "Rampa var", steps: "basamak",
    personal: "Kişisel rota", routeTitle: "Yol senin. _Ritim de._", routeBody: "Sezi profilini tanır; basamakları, eğimi ve kalabalık caddeleri hesaba katarak sana uygun yolu çizer.", routeButton: "Rotamı oluştur",
    accessibility: "Herkes için keşif", accessibilityTitle: "Görmek _tek yol_ değil.", accessibilityBody: "Hikâyelerle kendi ihtiyaçlarına uygun biçimde buluş.",
    features: [["Sesli anlatım", "Eserler sesle de anlatılır; pilot alanda yol tarifi sesli."], ["Okunaklı yazı", "Atkinson Hyperlegible ve üç kademe yazı boyu."], ["Yüksek kontrast", "Güneş altında bile okunan renkler."], ["Erişim bilgisi", "Basamak, rampa, açık saatler: gitmeden önce bil."]],
    listTitle: "Keşfe _buradan_ başla", mobile: "Sezi mobil", mobileTitle: "Sezi'ne _güven._", mobileBody: "Vakıf eserlerinin hikâyeleri yol boyunca yanında.", download: "Android uygulamasını indir",
  },
  en: {
    hero: "You are not lost, _you have yet to sense._", curve: "you are not lost… you have yet to sense · see, hear, touch ·",
    intro: "Discover foundation heritage through your own senses, at your own pace.", search: "What would you like to discover?", searchButton: "Search",
    works: "works", cities: "provinces", senses: "ways to sense", sensesDetail: "see, hear, touch",
    trust: "Trust your senses", manifesto: "Under every dome is a _story_, behind every stone an act of kindness.",
    manifestoBody: "Sezi makes the stories of foundation heritage accessible to everyone. Find your own way by seeing, hearing and touching.",
    provinces: "Explore provinces", tours: "tours", weekly: "Work of the week", location: "Location", type: "Type", access: "Access", stepFree: "Step-free entrance", ramp: "Ramp available", steps: "steps",
    personal: "Your route", routeTitle: "Your path. _Your pace._", routeBody: "Sezi considers your profile, steps, slopes and busy streets to find a route that suits you.", routeButton: "Plan my route",
    accessibility: "Discovery for everyone", accessibilityTitle: "Seeing is _not the only way._", accessibilityBody: "Explore stories in a way that suits your needs.",
    features: [["Audio stories", "Works can be heard too; spoken directions are available in the pilot area."], ["Readable text", "Atkinson Hyperlegible and three text sizes."], ["High contrast", "Colours designed to remain readable in sunlight."], ["Access information", "Steps, ramps, opening hours: know before you go."]],
    listTitle: "Start discovering _here._", mobile: "Sezi mobile", mobileTitle: "Trust _your senses._", mobileBody: "Take the stories of foundation heritage with you.", download: "Download the Android app",
  },
} as const;
