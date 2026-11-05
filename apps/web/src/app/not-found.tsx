import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";

import { NotFoundScreen } from "@/components/not-found-screen";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { themeCss } from "@/lib/theme";

import "./globals.css";

// Yazı tipleri önceden çekilmez: kapak fotoğrafı ilk bağlantıları paylaşmasın.
const heading = Fraunces({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-fraunces", display: "swap", preload: false });
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin", "latin-ext"], variable: "--font-atkinson", display: "swap", preload: false, adjustFontFallback: false });

export const metadata: Metadata = { title: "Sayfa bulunamadı · Page not found" };

/**
 * Kök yerleşim yok; bu sayfa yalnızca hiçbir rotaya düşmeyen adresler içindir.
 * `headers()` okunmaz: 404 sınırı dinamik olursa `notFound()` çağıran statik sayfa 500 verir.
 * Dil seçimi proxy'nin `/tr` veya `/en` yeniden yazımı ve `[lang]/not-found` üzerindedir.
 * Buraya düşen istek iki dili birden gösterir.
 */
export default function NotFound() {
  return (
    <html lang="tr" className={`${heading.variable} ${body.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
      </head>
      <body className="flex min-h-dvh flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] min-[1200px]:pb-0">
        <Providers lang="tr">
          <SiteHeader />
          <main id="icerik" tabIndex={-1} className="flex-1 outline-none">
            <NotFoundScreen lang="both" />
          </main>
          <SiteFooter lang="tr" />
        </Providers>
      </body>
    </html>
  );
}
