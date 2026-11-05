import { coverOf, loc } from "@sezi/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Band } from "@/components/ui/band";
import { RichTitle } from "@/components/ui/rich-title";
import { ToursList } from "@/components/tours/tours-list";
import { getNavOverlay, getTours, getWorkIndex } from "@/lib/data";
import { href, isLang, t } from "@/lib/i18n";
import { photoUrl } from "@/lib/media";

export const revalidate = 600;

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return {
    title: t(lang, "tours.title"),
    description: t(lang, "tours.subtitle"),
    alternates: {
      canonical: href(lang, "/turlar"),
      languages: {
        tr: href("tr", "/turlar"),
        en: href("en", "/turlar"),
      },
    },
  };
}

export default async function ToursPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ lang }, sp, overlay, works, tours] = await Promise.all([
    params,
    searchParams,
    getNavOverlay(),
    getWorkIndex(),
    getTours(),
  ]);
  if (!isLang(lang)) notFound();

  const rawProfil = sp.profil;
  const initialProfile = Array.isArray(rawProfil) ? rawProfil[0] : rawProfil;

  const firstWork = works.find((work) => work.slug === tours[0]?.stops[0]);
  const cover = firstWork ? coverOf(firstWork) : undefined;
  return (
    <>
      <Band size="short" image={cover ? photoUrl(cover) : undefined} alt={cover ? loc(cover.alt, lang) : ""} credit={cover?.credit}>
        <div className="absolute inset-x-0 bottom-0 grid gap-6 p-8 md:grid-cols-2 md:items-end md:p-12">
          <RichTitle as="h1" text={t(lang, "tours.heading")} className="font-heading text-[clamp(48px,7vw,96px)] leading-[1.02] tracking-[-0.03em]" />
          <p className="max-w-md text-lg">{t(lang, "tours.intro")}</p>
        </div>
      </Band>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <ToursList tours={tours} overlay={overlay} works={works} initialProfile={initialProfile} />
      </main>
    </>
  );
}
