import { coverOf, isAttributed, isCommons, loc } from "@sezi/shared";
import { notFound } from "next/navigation";

import { Explore } from "@/components/explore/explore";
import { PageContainer } from "@/components/page";
import { Band } from "@/components/ui/band";
import { getCities, getWorkIndex } from "@/lib/data";
import { toExploreItem } from "@/lib/explore";
import { isLang, t } from "@/lib/i18n";
import { photoUrl } from "@/lib/media";
import { buildTurkeyMap } from "@/lib/turkey-map";

export const revalidate = 600;

const copy = {
  tr: { title: "Eserler", subtitle: "Hatay, Konya ve Bursa'nın vakıf eserleri. Ara, süz, haritada gör." },
  en: { title: "Works", subtitle: "Foundation heritage in Hatay, Konya and Bursa. Search, filter and explore the map." },
};

export default async function WorksPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [works, cities] = await Promise.all([getWorkIndex(), getCities()]);
  const items = works.map(toExploreItem);
  const cityOrder = cities.map((city) => city.slug);
  const featured = [...works].sort((a, b) => a.slug.localeCompare(b.slug)).find((work) => coverOf(work));
  const cover = featured ? coverOf(featured) : undefined;
  const credit = cover
    ? isAttributed(cover)
      ? [cover.author?.trim() || t(lang, "works.commons.authorUnknown"), cover.license?.trim(), isCommons(cover) ? "Wikimedia Commons" : null].filter(Boolean).join(" · ")
      : cover.credit?.trim()
    : null;

  return (
    <>
      <Band
        size="short"
        image={cover ? photoUrl(cover, "full") : null}
        alt={cover && featured ? loc(cover.alt, lang) || loc(featured.name, lang) : ""}
        credit={credit}
        contentClassName="mx-auto flex max-w-7xl flex-col justify-end gap-4 px-6 pb-16 sm:px-10 sm:pb-20"
      >
        <h1 className="font-heading text-5xl font-normal leading-[1.02] tracking-[-0.03em] sm:text-7xl">{copy[lang].title}</h1>
        <p className="max-w-xl text-lg text-on-photo sm:text-xl">{copy[lang].subtitle}</p>
      </Band>
      <PageContainer className="grid gap-6 pt-6 sm:pt-10">
        <Explore items={items} cityOrder={cityOrder} map={buildTurkeyMap(items, cityOrder)} />
      </PageContainer>
    </>
  );
}
