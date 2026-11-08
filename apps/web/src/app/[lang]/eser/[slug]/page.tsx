import {
  coverOf,
  excerpt,
  hasLocation,
  inventorySource,
  loc,
  type WorkCondition,
  type WorkSource,
} from "@sezi/shared";
import { ExternalLinkIcon, LandmarkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LazySeziMap } from "@/components/map";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Tag } from "@/components/ui/tag";
import { CommunityPhotos } from "@/components/works/community-photos";
import { ListenButton } from "@/components/works/listen-button";
import { PhotoGallery } from "@/components/works/photo-gallery";
import { ReadMore } from "@/components/works/read-more";
import { PrecisionBadge, WorkCard } from "@/components/works/work-card";
import { getWork, getWorkIndex } from "@/lib/data";
import { href, isLang, t, type Lang, type MessageKey } from "@/lib/i18n";
import { AUDIO_BASE, photoUrl } from "@/lib/media";
import { PILOT_SLUGS } from "@/lib/pilot-slugs";
import { toneClass } from "@/lib/tone";

export const revalidate = 600;
// Sayfalar ilk ziyarette üretilir ve önbellekte kalır (ISR); derlemede önceden üretilmez.
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

const CONDITION_KEYS: Record<WorkCondition, MessageKey> = {
  intact: "works.condition.intact",
  restored: "works.condition.restored",
  damaged: "works.condition.damaged",
  destroyed: "works.condition.destroyed",
  unknown: "works.condition.unknown",
};

/** Envanter kitabı atfı: cilt başlıkta yoksa ayrıca yazılır; varsa yinelenmez. */
function formatBookAttribution(inv: WorkSource | undefined, lang: Lang): string | null {
  if (!inv) return null;
  const volumeInTitle = inv.volume !== null && new RegExp(`(Cilt|Vol\\.?|Volume)\\s*${inv.volume}\\b`, "i").test(inv.title);
  if (inv.volume !== null && inv.page && !volumeInTitle) {
    return t(lang, "works.detail.refVolumePage", {
      title: inv.title,
      volume: inv.volume,
      page: inv.page,
    });
  }
  if (inv.volume !== null && !volumeInTitle) {
    return t(lang, "works.detail.refVolume", { title: inv.title, volume: inv.volume });
  }
  if (inv.page) {
    return t(lang, "works.detail.refPageOnly", {
      title: inv.title,
      page: inv.page,
    });
  }
  return inv.title;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const work = await getWork(slug);
  if (!work) return {};

  const name = loc(work.name, lang);
  const rawDesc =
    loc(work.summary, lang) ||
    loc(work.history, lang) ||
    `${loc(work.type_name, lang)} · ${[work.district, loc(work.city_name, lang)].filter(Boolean).join(", ")}`;
  const description = excerpt(rawDesc, 160);
  const cover = coverOf(work);

  return {
    title: name,
    description,
    alternates: {
      languages: {
        tr: `/tr/eser/${work.slug}`,
        en: `/en/eser/${work.slug}`,
      },
    },
    ...(cover
      ? {
          openGraph: {
            title: name,
            description,
            images: [
              {
                url: photoUrl(cover, "full"),
                alt: loc(cover.alt, lang) || name,
              },
            ],
          },
        }
      : {}),
  };
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();

  const work = await getWork(slug);
  if (!work) notFound();

  const allWorks = work.complex_slug ? await getWorkIndex() : [];
  const complexSiblings = work.complex_slug
    ? allWorks.filter((w) => w.complex_slug === work.complex_slug && w.slug !== work.slug)
    : [];

  const name = loc(work.name, lang);
  const typeName = loc(work.type_name, lang);
  const cityName = loc(work.city_name, lang);
  const summary = loc(work.summary, lang);
  const history = loc(work.history, lang);
  const architecture = loc(work.architecture, lang);
  const period = loc(work.period, lang);
  const address = loc(work.address, lang);
  const conditionNote = loc(work.condition_note, lang);
  const complexName = loc(work.complex_name, lang);

  const inv = inventorySource(work);
  const bookAttribution = formatBookAttribution(inv, lang);
  const invSection = loc(inv?.section, lang);
  const otherSources = work.sources.filter((s) => s.kind !== "inventory");
  const isPilot = PILOT_SLUGS.has(work.slug);
  const cover = coverOf(work);

  // Ses kaydı: dilde varsa o, yoksa Türkçe kayıt (varsa); hiçbiri yoksa oynatıcı gösterilmez.
  const audioPath = lang === "en" ? (work.audio_en ?? work.audio_tr) : work.audio_tr;

  const audioSrc = audioPath ? `${AUDIO_BASE}${audioPath}` : null;
  const entrance = [
    work.visit_steps === null ? null : work.visit_steps === 0 ? t(lang, "works.detail.visitStepFree") : t(lang, "works.detail.visitSteps", { n: work.visit_steps }),
    work.visit_ramp ? t(lang, "works.detail.visitRamp") : null,
  ].filter((x): x is string => Boolean(x));
  const visitHours = loc(work.visit_hours, lang);
  const visitNote = loc(work.visit_note, lang);
  const visitRows = [
    entrance.length ? { key: "entrance", label: t(lang, "works.detail.entrance"), value: entrance.join(" · ") } : null,
    visitHours ? { key: "hours", label: t(lang, "works.detail.visitHours"), value: visitHours } : null,
    work.visit_minutes ? { key: "minutes", label: t(lang, "works.detail.glanceVisit"), value: t(lang, "works.detail.minutes", { n: work.visit_minutes }) } : null,
    visitNote ? { key: "note", label: t(lang, "works.detail.visitNote"), value: visitNote } : null,
    work.visit_source ? { key: "source", label: t(lang, "works.detail.sourceLabel"), value: work.visit_source } : null,
  ].filter((x) => x !== null);
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sezi.info").replace(/\/$/, "");
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LandmarksOrHistoricalBuildings",
    name,
    description: excerpt(summary || history || `${typeName} · ${cityName}`, 240),
    url: `${siteBase}/${lang}/eser/${work.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: work.district ?? undefined,
      addressRegion: cityName,
      streetAddress: address || undefined,
      addressCountry: "TR",
    },
    ...(hasLocation(work)
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: work.lat,
            longitude: work.lng,
          },
        }
      : {}),
    ...(cover ? { image: photoUrl(cover, "full") } : {}),
  };

  const heroRows = [
    { label: t(lang, "works.detail.location"), value: [work.district, cityName].filter(Boolean).join(", ") },
    { label: t(lang, "works.detail.infoType"), value: [typeName, complexName].filter(Boolean).join(" · ") },
    period ? { label: t(lang, "works.detail.infoPeriod"), value: [period, work.built_year].filter((x) => x !== null).join(" · ") } : null,
    entrance.length ? { label: t(lang, "works.detail.access"), value: entrance.join(" · ") } : null,
    visitHours ? { label: t(lang, "works.detail.visit"), value: visitHours } : null,
  ].filter((row) => row !== null);

  const record = (
    <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
      <section aria-labelledby="eser-kunye-heading" className="grid gap-4">
        <h2 id="eser-kunye-heading" className="text-2xl font-bold leading-tight">
          {t(lang, "works.detail.infoTitle")}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">{t(lang, "works.detail.infoType")}</dt>
            <dd className="text-lg font-medium text-foreground">{typeName}</dd>
          </div>
          {work.district ? (
            <div>
              <dt className="text-sm text-muted-foreground">{t(lang, "works.detail.infoDistrict")}</dt>
              <dd className="text-lg font-medium text-foreground">{work.district}</dd>
            </div>
          ) : null}
          {period ? (
            <div>
              <dt className="text-sm text-muted-foreground">{t(lang, "works.detail.infoPeriod")}</dt>
              <dd className="text-lg font-medium text-foreground">{period}</dd>
            </div>
          ) : null}
          {work.built_year !== null ? (
            <div>
              <dt className="text-sm text-muted-foreground">{t(lang, "works.detail.infoBuiltYear")}</dt>
              <dd className="num text-lg font-medium text-foreground">{work.built_year}</dd>
            </div>
          ) : null}
          {work.founder ? (
            <div>
              <dt className="text-sm text-muted-foreground">{t(lang, "works.detail.infoFounder")}</dt>
              <dd className="text-lg font-medium text-foreground">{work.founder}</dd>
            </div>
          ) : null}
          {work.condition !== "unknown" ? (
            <div>
              <dt className="text-sm text-muted-foreground">{t(lang, "works.detail.infoCondition")}</dt>
              <dd className="text-lg font-medium text-foreground">
                {t(lang, CONDITION_KEYS[work.condition])}
                {conditionNote ? <span className="block text-sm font-normal text-muted-foreground">{conditionNote}</span> : null}
              </dd>
            </div>
          ) : null}
          {work.complex_slug && complexName ? (
            <div>
              <dt className="text-sm text-muted-foreground">{t(lang, "works.detail.infoComplex")}</dt>
              <dd className="text-lg font-medium">
                <Link href={href(lang, `/kulliye/${work.complex_slug}`)} className="text-link underline-offset-4 hover:underline">
                  {complexName}
                </Link>
              </dd>
            </div>
          ) : null}
          {invSection ? (
            <div>
              <dt className="text-sm text-muted-foreground">{t(lang, "works.detail.infoBookSection")}</dt>
              <dd className="text-lg font-medium text-foreground">{invSection}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {inv || otherSources.length > 0 ? (
        <section aria-labelledby="eser-kaynak-heading" className="grid gap-4">
          <h2 id="eser-kaynak-heading" className="text-2xl font-bold leading-tight">
            {t(lang, "works.detail.sourcesTitle")}
          </h2>
          <div className="grid gap-3 text-base leading-relaxed text-foreground">
            {inv ? (
              <div className="grid gap-1 rounded-xl bg-card p-4 contrast:outline-2 contrast:outline-border">
                <span className="text-lg font-medium">{bookAttribution ?? inv.title}</span>
                {inv.url ? (
                  <a href={inv.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-1 font-semibold text-link underline">
                    <span>{t(lang, "works.detail.openBookPdf")}</span>
                    <ExternalLinkIcon className="size-4" aria-hidden />
                  </a>
                ) : null}
              </div>
            ) : null}
            {otherSources.map((src) => (
              <div key={src.id} className="grid gap-1 rounded-xl bg-card p-4 contrast:outline-2 contrast:outline-border">
                <span>{[src.title, src.publisher, src.year ? String(src.year) : null, src.page ? `s. ${src.page}` : null].filter(Boolean).join(" · ")}</span>
                {src.url ? (
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-1 font-semibold text-link underline">
                    <span>{t(lang, "works.detail.openSourceUrl")}</span>
                    <ExternalLinkIcon className="size-4" aria-hidden />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );

  return (
    <main data-band="solid" className="work-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className={`relative m-3 overflow-hidden rounded-b-[34px] rounded-t-[28px] ${cover ? "" : toneClass(work.type_slug)}`}>
        {cover ? (
          <div className="absolute inset-0">
            <PhotoGallery photos={work.photos} workName={name} typeSlug={work.type_slug} />
          </div>
        ) : (
          <LandmarkIcon aria-hidden className="pointer-events-none absolute right-6 top-1/2 z-10 hidden size-[200px] -translate-y-1/2 opacity-35 sm:right-[10%] sm:block" strokeWidth={1.2} />
        )}
        <div className={`relative flex min-h-[620px] w-[60%] flex-col justify-between gap-10 px-5 pb-20 pt-20 sm:w-[54%] sm:px-10 min-[900px]:min-h-[min(86vh,760px)] min-[900px]:px-12 ${cover ? "work-hero-glass" : "!w-full"}`}>
          <div className={`grid gap-6 ${cover ? "work-hero-veil" : ""}`}>
            <p className="flex flex-wrap items-center gap-x-2 text-[13px] font-bold tracking-[0.16em]">
              <Link className="inline-flex min-h-12 items-center underline-offset-4 hover:underline" href={href(lang, `/eserler?tur=${encodeURIComponent(work.type_slug)}`)}>{typeName.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-GB")}</Link>
              <span aria-hidden>·</span>
              <Link className="inline-flex min-h-12 items-center underline-offset-4 hover:underline" href={href(lang, `/il/${work.city_slug}`)}>{[work.district, cityName].filter(Boolean).join(", ").toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-GB")}</Link>
            </p>
            <h1 className="break-words font-heading text-[clamp(2rem,5vw,4.75rem)] font-normal leading-[1.02] tracking-[-0.03em]">{name}</h1>
            <div className="flex flex-wrap gap-2">
              <PrecisionBadge precision={work.location_precision} lang={lang} />
              {work.unesco ? <Tag tone="neutral">{t(lang, "works.unesco")}</Tag> : null}
            </div>
          </div>
          {heroRows.length ? <dl className={`grid gap-4 ${cover ? "work-hero-veil" : ""}`}>{heroRows.map((row) => (
            <div key={row.label}><dt className={`text-sm ${cover ? "font-bold" : "text-muted-foreground"}`}>{row.label}</dt><dd className="text-lg">{row.value}</dd></div>
          ))}</dl> : <div />}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className={cover ? "work-hero-veil" : ""}>{audioSrc ? <ListenButton src={audioSrc} workName={name} /> : null}</div>
            {work.built_year !== null || period ? <span className={`ml-auto break-words text-right font-heading text-4xl ${cover ? "work-hero-veil" : ""}`}>{work.built_year ?? period}</span> : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-16 px-5 py-16 sm:px-8 lg:gap-24">
        <div className="grid items-start gap-12 min-[900px]:grid-cols-[1.3fr_1fr]">
          <section aria-label={t(lang, "works.detail.story")} className="grid max-w-[65ch] gap-7">
            <Eyebrow as="h2" className="font-sans" lang={lang} text={t(lang, "works.detail.story")} />
            {summary ? <p className="text-[19px] leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:font-heading first-letter:text-[64px] first-letter:leading-[0.8] first-letter:text-link contrast:first-letter:float-none contrast:first-letter:mr-0 contrast:first-letter:font-sans contrast:first-letter:text-[inherit] contrast:first-letter:leading-[inherit] contrast:first-letter:text-inherit">{summary}</p> : null}
            {history ? <section aria-labelledby="eser-tarihce-heading" className="grid gap-4">
              <h3 id="eser-tarihce-heading" className="font-heading text-3xl font-normal">{t(lang, "works.detail.historyTitle")}</h3>
              <ReadMore text={history} headingId="eser-tarihce-heading" contentId="eser-tarihce-icerik" />
            </section> : null}
            {architecture ? <section aria-labelledby="eser-mimari-heading" className="grid gap-4">
              <h3 id="eser-mimari-heading" className="font-heading text-3xl font-normal">{t(lang, "works.detail.architectureTitle")}</h3>
              <ReadMore text={architecture} headingId="eser-mimari-heading" contentId="eser-mimari-icerik" />
            </section> : null}
            {!summary && !history && !architecture ? <p className="text-muted-foreground">{t(lang, "works.detail.noText")}</p> : null}
            {bookAttribution && (summary || history || architecture) ? <p className="text-sm text-muted-foreground">{t(lang, "works.detail.bookAttribution", { attribution: bookAttribution })}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              {isPilot ? <Button asChild arrow><Link href={href(lang, `/rota?hedef=${encodeURIComponent(work.slug)}`)}>{t(lang, "works.detail.planRoute")}</Link></Button> : null}
              {audioSrc ? <ListenButton src={audioSrc} workName={name} /> : null}
            </div>
          </section>
          <aside className="grid gap-6 rounded-[28px] bg-card p-7 contrast:outline-2 contrast:outline-border min-[900px]:sticky min-[900px]:top-24">
            <h2 className="font-heading text-3xl font-normal">{t(lang, "works.detail.visitTitle")}</h2>
            {visitRows.length ? <dl className="grid gap-4">{visitRows.map((row) => (
              <div key={row.key} className="grid gap-1"><dt className="text-sm text-muted-foreground">{row.label}</dt><dd>{row.value}</dd></div>
            ))}</dl> : <p className="text-muted-foreground">{t(lang, "works.detail.visitPending")}</p>}
            <Link href={href(lang, `/bildirim?eser=${encodeURIComponent(work.slug)}`)} className="inline-flex min-h-12 items-center font-bold text-link underline underline-offset-4">{t(lang, "works.detail.reportIssue")}</Link>
          </aside>
        </div>
        <section aria-labelledby="eser-harita-heading" className="grid gap-5">
          <h2 id="eser-harita-heading" className="font-heading text-4xl font-normal">{t(lang, "works.detail.mapTitle")}</h2>
          {hasLocation(work) ? <LazySeziMap label={`${name} — ${t(lang, "works.detail.mapTitle")}`} center={[work.lng, work.lat]} zoom={work.location_precision === "exact" ? 16.5 : 15} miniMap markers={[{ id: work.slug, location: [work.lng, work.lat], label: name, typeSlug: work.type_slug, approximate: work.location_precision !== "exact", emphasis: "dest" }]} className="mini-map h-80 w-full rounded-[28px]" /> : <p className="text-muted-foreground">{t(lang, "works.detail.unlocated")}</p>}
          {address ? <p className="text-lg">{address}</p> : null}
        </section>
        <CommunityPhotos slug={work.slug} />
        {record}
        {complexName && work.complex_slug && complexSiblings.length > 0 ? <section aria-labelledby="eser-kulliye-heading" className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="eser-kulliye-heading" className="font-heading text-4xl font-normal">{t(lang, "works.detail.complexTitle")}</h2>
            <Link href={href(lang, `/kulliye/${work.complex_slug}`)} className="inline-flex min-h-12 items-center font-bold text-link underline-offset-4 hover:underline">{t(lang, "works.detail.complexAllLink", { name: complexName })}</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{complexSiblings.slice(0, 3).map((sibling) => <WorkCard key={sibling.slug} work={sibling} lang={lang} />)}</div>
        </section> : null}
      </div>
    </main>
  );
}
