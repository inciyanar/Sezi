import {
  coverOf,
  excerpt,
  hasLocation,
  inventorySource,
  loc,
  type WorkCondition,
  type WorkSource,
} from "@sezi/shared";
import { AlertTriangleIcon, ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LazySeziMap } from "@/components/map";
import { PageContainer } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { CommunityPhotos } from "@/components/works/community-photos";
import { PhotoGallery } from "@/components/works/photo-gallery";
import { ReadMore } from "@/components/works/read-more";
import { PrecisionBadge, WorkCard } from "@/components/works/work-card";
import { WorkActions } from "@/components/works/work-actions";
import { WorkTabs, type WorkTabPanel } from "@/components/works/work-tabs";
import { getWork, getWorkIndex } from "@/lib/data";
import { href, isLang, t, type Lang, type MessageKey } from "@/lib/i18n";
import { AUDIO_BASE, photoUrl } from "@/lib/media";
import { PILOT_SLUGS } from "@/lib/pilot-slugs";

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

  // Kısa bakış: kayıtta olan bilgilerden en az ikisi varsa (yapım, dönem, gezme süresi). Tek bilgi şerit olmaz.
  const glance = [
    work.built_year !== null ? { key: "built", label: t(lang, "works.detail.infoBuiltYear"), value: String(work.built_year) } : null,
    period ? { key: "period", label: t(lang, "works.detail.infoPeriod"), value: period } : null,
    work.visit_minutes ? { key: "visit", label: t(lang, "works.detail.glanceVisit"), value: t(lang, "works.detail.minutes", { n: work.visit_minutes }) } : null,
  ].filter((x) => x !== null);

  // Gitmeden önce: yalnız kaynağı ve kontrol tarihiyle girilen bilgi; yoksa bunu açıkça söyler (mobildekiyle aynı).
  const entrance = [
    work.visit_steps === null ? null : work.visit_steps === 0 ? t(lang, "works.detail.visitStepFree") : t(lang, "works.detail.visitSteps", { n: work.visit_steps }),
    work.visit_ramp === null ? null : work.visit_ramp ? t(lang, "works.detail.visitRamp") : t(lang, "works.detail.visitNoRamp"),
  ].filter((x): x is string => Boolean(x));
  const visitHours = loc(work.visit_hours, lang);
  const visitNote = loc(work.visit_note, lang);
  const visitRows = [
    entrance.length ? { key: "entrance", label: t(lang, "works.detail.entrance"), value: entrance.join(" · ") } : null,
    visitHours ? { key: "hours", label: t(lang, "works.detail.visitHours"), value: visitHours } : null,
    work.visit_minutes ? { key: "minutes", label: t(lang, "works.detail.glanceVisit"), value: t(lang, "works.detail.minutes", { n: work.visit_minutes }) } : null,
    visitNote ? { key: "note", label: t(lang, "works.detail.visitNote"), value: visitNote } : null,
  ].filter((x) => x !== null);
  const visitChecked = work.visit_checked_on
    ? new Date(`${work.visit_checked_on}T12:00:00`).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;
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

  const about = (
    <div className="grid max-w-[65ch] gap-12">
      {summary ? <p className="text-xl leading-[1.6] text-foreground">{summary}</p> : null}
      {history ? (
        <section aria-labelledby="eser-tarihce-heading" className="grid gap-4">
          <h2 id="eser-tarihce-heading" className="text-2xl font-bold leading-tight">
            {t(lang, "works.detail.historyTitle")}
          </h2>
          <ReadMore text={history} headingId="eser-tarihce-heading" contentId="eser-tarihce-icerik" />
        </section>
      ) : null}
      {architecture ? (
        <section aria-labelledby="eser-mimari-heading" className="grid gap-4">
          <h2 id="eser-mimari-heading" className="text-2xl font-bold leading-tight">
            {t(lang, "works.detail.architectureTitle")}
          </h2>
          <ReadMore text={architecture} headingId="eser-mimari-heading" contentId="eser-mimari-icerik" />
        </section>
      ) : null}
      {bookAttribution && (history || architecture) ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t(lang, "works.detail.bookAttribution", { attribution: bookAttribution })}
        </p>
      ) : null}
    </div>
  );
  const aboutPanel: WorkTabPanel[] = summary || history || architecture ? [{ value: "about", label: t(lang, "works.detail.tab.about"), content: about }] : [];

  const visit = (
    <div className="grid gap-12">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <section aria-labelledby="eser-harita-heading" className="grid gap-4">
          <h2 id="eser-harita-heading" className="text-2xl font-bold leading-tight">
            {t(lang, "works.detail.mapTitle")}
          </h2>
          {hasLocation(work) ? (
            <LazySeziMap
              label={`${name} — ${t(lang, "works.detail.mapTitle")}`}
              center={[work.lng, work.lat]}
              zoom={work.location_precision === "exact" ? 16.5 : 15}
              miniMap
              markers={[
                {
                  id: work.slug,
                  location: [work.lng, work.lat],
                  label: name,
                  typeSlug: work.type_slug,
                  approximate: work.location_precision !== "exact",
                  emphasis: "dest",
                },
              ]}
              className="mini-map h-72 w-full rounded-xl"
            />
          ) : null}
          {address ? <p className="text-lg leading-relaxed text-foreground">{address}</p> : null}
          {!hasLocation(work) ? <p className="text-lg leading-relaxed text-muted-foreground">{t(lang, "works.detail.unlocated")}</p> : null}
        </section>

        <section aria-labelledby="eser-gitmeden-heading" className="grid gap-4">
          <h2 id="eser-gitmeden-heading" className="text-2xl font-bold leading-tight">
            {t(lang, "works.detail.visitTitle")}
          </h2>
          {visitRows.length ? (
            <dl className="grid gap-4">
              {visitRows.map((r) => (
                <div key={r.key}>
                  <dt className="text-sm text-muted-foreground">{r.label}</dt>
                  <dd className="text-lg font-medium text-foreground">{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {work.visit_source && visitChecked
              ? t(lang, "works.detail.visitSource", { source: work.visit_source, date: visitChecked })
              : t(lang, "works.detail.visitPending")}
          </p>
          <Link
            href={href(lang, `/bildirim?eser=${work.slug}`)}
            className="flex min-h-14 items-center gap-3 rounded-xl bg-card px-4 text-base font-semibold text-foreground hover:bg-muted contrast:outline-2 contrast:outline-border"
          >
            <AlertTriangleIcon className="size-5 shrink-0" aria-hidden />
            <span className="flex-1">{t(lang, "works.detail.reportIssue")}</span>
            <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </section>
      </div>

      <CommunityPhotos slug={work.slug} />

      {complexName && work.complex_slug && complexSiblings.length > 0 ? (
        <section aria-labelledby="eser-kulliye-heading" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="eser-kulliye-heading" className="text-2xl font-bold leading-tight">
              {t(lang, "works.detail.complexTitle")}
            </h2>
            <Link
              href={href(lang, `/kulliye/${work.complex_slug}`)}
              className="inline-flex min-h-12 items-center text-base font-semibold text-link underline-offset-4 hover:underline"
            >
              {t(lang, "works.detail.complexAllLink", { name: complexName })}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {complexSiblings.slice(0, 3).map((sibling) => (
              <WorkCard key={sibling.slug} work={sibling} lang={lang} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );

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
    <PageContainer className="work-detail-page grid gap-0 pt-4 sm:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PhotoGallery photos={work.photos} workName={name} typeSlug={work.type_slug} />

      {/* Yer kartı: kapağın son 40-48 px'ine biner (mobildeki gibi). Ad, tür ve yer, rozetler, kısa bakış ve eylemler; sonra sekmeler. */}
      <div className="relative -mt-10 grid gap-10 rounded-t-3xl bg-background px-1 pt-7 sm:-mt-12 sm:px-8 sm:pt-9 lg:px-10">
        <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end lg:gap-12">
          <div className="grid gap-4">
            <h1 className="line-clamp-2 max-w-[20ch] text-[clamp(2.25rem,5vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
              {name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-muted-foreground">
              <Link href={href(lang, `/?tur=${work.type_slug}`)} className="inline-flex min-h-12 items-center font-semibold text-foreground underline-offset-4 hover:underline">
                {typeName}
              </Link>
              <span aria-hidden>·</span>
              <Link href={href(lang, `/il/${work.city_slug}`)} className="inline-flex min-h-12 items-center font-semibold text-foreground underline-offset-4 hover:underline">
                {[work.district, cityName].filter(Boolean).join(", ")}
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 [&_[data-slot=badge]]:h-auto [&_[data-slot=badge]]:min-h-8 [&_[data-slot=badge]]:text-sm">
              <PrecisionBadge precision={work.location_precision} lang={lang} />
              {work.unesco ? <Badge variant="secondary">{t(lang, "works.unesco")}</Badge> : null}
            </div>
            {glance.length >= 2 ? (
              <dl className="flex flex-wrap gap-x-10 gap-y-3 pt-2">
                {glance.map((g) => (
                  <div key={g.key}>
                    <dt className="text-sm text-muted-foreground">{g.label}</dt>
                    <dd className="text-xl font-bold text-foreground">{g.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <WorkActions
            routeHref={isPilot ? href(lang, `/rota?hedef=${work.slug}`) : null}
            audioSrc={audioPath ? `${AUDIO_BASE}${audioPath}` : null}
            workName={name}
          />
        </header>

        {/* Metni olmayan eserde Hakkında sekmesi yok; sayfa Ziyaret ile açılır. */}
        <WorkTabs panels={[...aboutPanel, { value: "visit", label: t(lang, "works.detail.tab.visit"), content: visit }, { value: "record", label: t(lang, "works.detail.tab.record"), content: record }]} />
      </div>
    </PageContainer>
  );
}
