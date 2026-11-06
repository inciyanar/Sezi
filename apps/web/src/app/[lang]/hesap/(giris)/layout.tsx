import { coverOf, loc } from "@sezi/shared";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { RichTitle } from "@/components/ui/rich-title";
import { PhotoSource } from "@/components/works/photo-source";
import { getWork } from "@/lib/data";
import { isLang, t } from "@/lib/i18n";
import { photoUrl } from "@/lib/media";

export const revalidate = 600;

/**
 * Giriş, kayıt, doğrulama ve şifre sıfırlama: geniş ekranda solda Ulu Cami fotoğrafı (veritabanındaki kapak,
 * atfıyla) ve Sezi sözü, sağda form. Dar ekranda yalnız form; fotoğraf yoksa koyu zemin kalır.
 */
export default async function AuthLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const work = await getWork("bursa-ulucami");
  const photo = work ? coverOf(work) : undefined;
  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-3 pb-10 min-[1000px]:min-h-[calc(100dvh-7.5rem)] min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section
        data-surface="photo"
        className="relative isolate hidden overflow-hidden rounded-[28px] bg-foreground text-[var(--on-photo)] min-[1000px]:flex min-[1000px]:flex-col min-[1000px]:justify-end"
      >
        {photo ? (
          <Image src={photoUrl(photo)} alt={loc(photo.alt, lang)} fill priority sizes="50vw" className="-z-10 object-cover" />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--foreground)_30%,transparent)_0%,transparent_35%,color-mix(in_srgb,var(--foreground)_88%,transparent)_100%)] contrast:bg-foreground/80"
        />
        {photo ? <PhotoSource photo={photo} align="end" side="bottom" className="absolute top-4 right-4" /> : null}
        <div className="grid gap-6 p-10 xl:p-14">
          <BrandMark className="h-8 text-[var(--on-photo)]" />
          <RichTitle as="p" text={t(lang, "auth.quote")} className="max-w-lg text-[clamp(2.5rem,3.6vw,3.75rem)] font-light" />
          <p className="max-w-md text-lg text-[var(--on-photo)]/85">{t(lang, "auth.quoteBody")}</p>
        </div>
      </section>
      <div className="flex items-center justify-center px-1 py-4 sm:px-6 min-[1000px]:py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
