import { coverOf, isAttributed, isShowcaseWork, loc, PROFILE_KEYS } from "@sezi/shared";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessibilityIcon, ArrowUpRightIcon, AudioLinesIcon, ContrastIcon, EarOffIcon, EyeOffIcon, PersonStandingIcon } from "lucide-react";

import ulucamiPhoto from "@/assets/bursa-ulucami.jpg";
import { HomeList } from "@/components/home/home-list";
import { SensoryDiscovery } from "@/components/home/sensory-discovery";
import { TourPreview } from "@/components/home/tour-preview";
import { Band } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Glass } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { RichTitle } from "@/components/ui/rich-title";
import { ListenButton } from "@/components/works/listen-button";
import { PhotoSource } from "@/components/works/photo-source";
import { getCities, getNavOverlay, getShowcaseWorks, getTours, getWork, getWorkIndex } from "@/lib/data";
import { pickHero } from "@/lib/home";
import { href, isLang, t } from "@/lib/i18n";
import { AUDIO_BASE, photoUrl } from "@/lib/media";
import { homeCopy } from "@/lib/messages/home";

export const revalidate = 600;

const profileIcons = {
  walker: PersonStandingIcon,
  wheelchair: AccessibilityIcon,
  blind: EyeOffIcon,
  deaf: EarOffIcon,
};
const featureIcons = [AudioLinesIcon, null, ContrastIcon, AccessibilityIcon] as const;
const preferredHeroPath = "bursa/8df4d47f43b3.webp";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [works, cities, tours, overlay, weeklyWork] = await Promise.all([getWorkIndex(), getCities(), getTours(), getNavOverlay(), getWork("bursa-ulucami")]);
  const showcaseWorks = await getShowcaseWorks(works);
  const weekly = weeklyWork && isShowcaseWork(weeklyWork) ? weeklyWork : null;
  const populatedCities = cities
    .filter((city) => works.some((work) => work.city_slug === city.slug))
    .sort((a, b) => works.filter((work) => work.city_slug === b.slug).length - works.filter((work) => work.city_slug === a.slug).length);
  const copy = homeCopy[lang];
  const now = new Date();
  const hero = showcaseWorks.find((work) => work.photos?.some((photo) => photo.path === preferredHeroPath)) ?? pickHero(showcaseWorks, now);
  const heroPhoto = hero?.photos?.find((photo) => photo.path === preferredHeroPath) ?? (hero && coverOf(hero));
  const weeklyPhoto = weekly ? coverOf(weekly) : undefined;
  const weeklyPhotoSource = weeklyPhoto && {
    ...weeklyPhoto,
    origin: "commons" as const,
    author: "Beñat Irasuegi",
    license: "CC BY-SA 4.0",
    license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    source_url: "https://commons.wikimedia.org/wiki/File:71_Bursa_la_Grande_Moschea_(Edited).jpg",
    modifications: {
      tr: "Kaynağın düzenlenmiş sürümü; web için yeniden boyutlandırılır, biçimi dönüştürülür ve görüntüleme alanına göre kırpılır.",
      en: "Edited source version; resized, format-converted and cropped to the display area for the web.",
    },
  };
  const access = weekly
    ? [
        weekly.visit_steps === 0
          ? copy.stepFree
          : weekly.visit_steps != null && weekly.visit_steps > 0
            ? `${weekly.visit_steps} ${copy.steps}`
            : null,
        weekly.visit_ramp ? copy.ramp : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const audio = weekly && (lang === "en" ? (weekly.audio_en ?? weekly.audio_tr) : weekly.audio_tr);
  const firstTour = tours[0];

  return (
    <>
      <Band
        size="hero"
        image={heroPhoto ? photoUrl(heroPhoto) : null}
        alt={loc(heroPhoto?.alt, lang)}
        imageClassName="home-hero-image"
        contentClassName="flex min-h-[max(680px,calc(100dvh-24px))] flex-col justify-end px-6 pt-32 pb-28 min-[900px]:px-12 min-[1200px]:pb-11"
        className="h-auto min-h-[max(680px,calc(100dvh-24px))] min-[900px]:h-[calc(100dvh-24px)]"
      >
        {heroPhoto && (
          <div className="absolute top-24 right-6 z-20 flex max-w-[65%] items-center gap-2">
            {heroPhoto.credit && !isAttributed(heroPhoto) && <span className="rounded-full bg-foreground/60 px-3 py-2 text-xs">{heroPhoto.credit}</span>}
            <PhotoSource photo={heroPhoto} align="end" side="bottom" />
          </div>
        )}
        <svg className="pointer-events-none absolute top-[12%] left-0 hidden w-full min-[900px]:block" viewBox="0 0 1440 300" aria-hidden="true">
          <path
            id="home-ridge"
            d="M120 230 C 260 230, 300 120, 420 120 S 560 210, 660 170 S 780 40, 880 60 S 1000 190, 1100 170 S 1260 110, 1340 150"
            fill="none"
          />
          <text className="fill-[var(--on-photo)] font-heading text-[30px] italic">
            <textPath href="#home-ridge">{copy.curve}</textPath>
          </text>
        </svg>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-end gap-6 min-[900px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] min-[900px]:gap-12">
          <RichTitle as="h1" text={copy.hero} className="min-w-0 max-w-4xl break-words font-heading text-[clamp(3rem,7vw,6.75rem)] font-light leading-[0.98] tracking-[-0.035em]" />
          <div className="min-w-0">
            <p className="max-w-md text-lg">{copy.intro}</p>
            <form
              action={href(lang, "/eserler")}
              className="mt-6 flex max-w-lg items-center gap-2 rounded-full bg-[var(--on-photo)] p-2 pl-5 text-foreground"
            >
              <label className="sr-only" htmlFor="home-search">
                {copy.search}
              </label>
              <input id="home-search" name="q" placeholder={copy.search} className="min-w-0 flex-1 rounded bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <Button type="submit">{copy.searchButton}</Button>
            </form>
            <div className="mt-6 flex max-w-[calc(100%-5rem)] flex-wrap gap-6 text-sm min-[1200px]:max-w-none">
              <span>
                <b className="block font-heading text-3xl font-normal">{works.length}</b>
                {copy.works}
              </span>
              <span>
                <b className="block font-heading text-3xl font-normal">{populatedCities.length}</b>
                {copy.cities}
              </span>
              <span>
                <b className="block font-heading text-3xl font-normal">3</b>
                {copy.senses} · {copy.sensesDetail}
              </span>
            </div>
          </div>
        </div>
      </Band>

      <SensoryDiscovery lang={lang} copy={copy} />

      <Reveal className="mx-auto max-w-[1280px] px-6 pb-24">
        <h2 className="mb-8 font-heading text-[clamp(2.25rem,4.4vw,3.875rem)] font-light">{copy.provinces}</h2>
        <div className="grid gap-4 min-[900px]:grid-cols-[1.25fr_1fr_1fr]">
          {populatedCities.map((city) => {
            const cityWorks = works.filter((w) => w.city_slug === city.slug);
            // Şehrin fotoğraflı ilk eseri (Bursa'da hero ile aynı kare); yayında fotoğrafı yoksa desenli zemin kalır.
            const cityPhoto = hero?.city_slug === city.slug ? heroPhoto : cityWorks.map(coverOf).find(Boolean);
            const count = tours.filter((tour) => tour.citySlug === city.slug).length;
            return (
              <div key={city.slug} className="relative">
              <Link
                href={href(lang, `/il/${city.slug}`)}
                data-surface="photo"
                className={`relative isolate flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] p-7 text-[var(--on-photo)] min-[900px]:min-h-[520px] ${city.slug === "konya" ? "bg-[var(--brand-mark)]" : "bg-[var(--tone-teal-ink)]"}`}
              >
                {cityPhoto ? (
                  <>
                    <Image src={photoUrl(cityPhoto)} alt="" fill sizes="(min-width:900px) 40vw, 100vw" className="-z-20 object-cover" />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-foreground/80 to-foreground/30 contrast:bg-foreground/80" />
                  </>
                ) : city.slug === "hatay" ? (
                  <svg aria-hidden className="absolute inset-0 -z-10 size-full opacity-15" viewBox="0 0 200 200" preserveAspectRatio="none">
                    {[30, 60, 90, 120, 150, 180].map((y) => (
                      <path key={y} d={`M0 ${y} Q 25 ${y - 14} 50 ${y} T 100 ${y} T 150 ${y} T 200 ${y}`} fill="none" stroke="currentColor" strokeWidth="2" />
                    ))}
                  </svg>
                ) : city.slug === "konya" ? (
                  <svg aria-hidden className="absolute inset-0 -z-10 size-full opacity-15" viewBox="0 0 200 200">
                    <path
                      d="M100 5 120 65 180 40 145 100 195 130 130 130 100 195 70 130 5 130 55 100 20 40 80 65Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                ) : null}
                <span className="flex items-center justify-between gap-4 font-bold">
                  <span>{cityWorks.length} {copy.works}{count ? ` · ${count} ${copy.tours}` : ""}</span>
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--on-photo)] text-foreground"><ArrowUpRightIcon aria-hidden /></span>
                </span>
                <span className="font-heading text-5xl font-light">{loc(city.name, lang)}</span>
              </Link>
              {cityPhoto && (
                <div className="absolute right-4 bottom-4 flex max-w-[55%] items-center gap-2">
                  {cityPhoto.credit && !isAttributed(cityPhoto) && <span className="rounded-full bg-foreground/60 px-2 py-1 text-xs text-on-photo">{cityPhoto.credit}</span>}
                  <PhotoSource photo={cityPhoto} align="end" />
                </div>
              )}
              </div>
            );
          })}
        </div>
      </Reveal>

      {weekly && weeklyPhoto ? (
        <Reveal className="relative mx-3 overflow-hidden rounded-[28px] bg-secondary pt-64 sm:pt-80 md:min-h-[760px] md:pt-0">
          <div className="absolute inset-x-0 top-0 h-64 sm:h-80 md:h-full">
            <Image src={ulucamiPhoto} alt={loc(weeklyPhoto.alt, lang)} fill sizes="100vw" className="object-cover" />
          </div>
          <Link href={href(lang, `/eser/${weekly.slug}`)} aria-label={loc(weekly.name, lang)} className="absolute inset-0 z-0" />
          <Glass
            tone="light"
            grain
            className={`relative z-10 flex flex-col p-8 md:min-h-[760px] md:w-[46%] md:p-14 ${audio || weekly.built_year || weekly.period ? "justify-between" : "justify-center"}`}
          >
            <div>
              <Eyebrow text={copy.weekly} lang={lang} />
              <Link href={href(lang, `/eser/${weekly.slug}`)} className="mt-5 block font-heading text-[clamp(2.5rem,4vw,3.625rem)] font-light leading-tight hover:underline">
                {loc(weekly.name, lang)}
              </Link>
              <dl className="mt-9 grid gap-5">
                {[
                  [copy.location, [weekly.district, loc(weekly.city_name, lang)].filter(Boolean).join(", ")],
                  [copy.type, [loc(weekly.type_name, lang), loc(weekly.complex_name, lang)].filter(Boolean).join(" · ")],
                  [copy.access, access],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-bold">{label}</dt>
                      <dd className="text-muted-foreground">{value}</dd>
                    </div>
                  ))}
              </dl>
            </div>
            {(audio || weekly.built_year || weekly.period) && (
              <div className="mt-8 flex items-end justify-between gap-4">
                {audio && (
                  <ListenButton
                    src={`${AUDIO_BASE}${audio}`}
                    workName={loc(weekly.name, lang)}
                    label={lang === "tr" ? "Sesli anlatımı dinle" : "Listen to the audio story"}
                  />
                )}
                <span className="font-heading text-4xl">{weekly.built_year ?? loc(weekly.period, lang)}</span>
              </div>
            )}
          </Glass>
          <div className="absolute top-4 right-4 z-10 flex max-w-[60%] items-center gap-2 md:top-auto md:right-6 md:bottom-6">
            <PhotoSource photo={weeklyPhotoSource} align="end" side="top" />
          </div>
        </Reveal>
      ) : null}

      <Reveal className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 py-24 min-[900px]:grid-cols-[1fr_1.2fr] min-[900px]:gap-16 md:py-36">
        <div>
          <Eyebrow text={copy.personal} lang={lang} />
          <RichTitle as="h2" text={copy.routeTitle} className="mt-5 font-heading text-[clamp(2.5rem,4.6vw,4.25rem)] font-light leading-tight" />
          <p className="mt-6 max-w-md text-lg text-muted-foreground">{copy.routeBody}</p>
          <div className="my-8 flex flex-wrap gap-2">
            {PROFILE_KEYS.map((key) => {
              const Icon = profileIcons[key];
              return (
                <Link key={key} href={href(lang, `/rota?profil=${key}`)} className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 font-bold">
                  <Icon className="size-5" aria-hidden />
                  {t(lang, `route.profile.${key}`)}
                </Link>
              );
            })}
          </div>
          <Button asChild size="lg" arrow>
            <Link href={href(lang, "/rota")}>{copy.routeButton}</Link>
          </Button>
        </div>
        {firstTour && <TourPreview tour={firstTour} works={works} overlay={overlay} lang={lang} />}
      </Reveal>

      <Reveal className="mx-3 rounded-[28px] bg-primary px-6 py-20 text-primary-foreground md:px-16 md:py-28">
        <div data-surface="photo" className="mx-auto max-w-[1150px]">
          <Eyebrow text={copy.accessibility} lang={lang} />
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <RichTitle as="h2" text={copy.accessibilityTitle} className="font-heading text-[clamp(2.5rem,4.6vw,4.25rem)] font-light leading-tight" />
            <p className="self-end text-lg">{copy.accessibilityBody}</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.features.map(([title, body], index) => {
              const Icon = featureIcons[index];
              return (
                <article
                  key={title}
                  className={`flex min-h-[260px] flex-col justify-between gap-8 rounded-[22px] p-6 ${index === 0 ? "bg-gold text-gold-foreground" : "border border-current/20 bg-[var(--nav-active)] text-[var(--on-photo)]"}`}
                >
                  <span className="grid size-[52px] place-items-center rounded-2xl bg-current/10" aria-hidden>
                    {Icon ? <Icon className="size-6" /> : <span className="font-heading text-2xl">Aa</span>}
                  </span>
                  <div>
                    <h3 className="font-heading text-[1.625rem] font-normal leading-tight">{title}</h3>
                    <p className="mt-2">{body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Reveal>

      <Reveal className="mx-auto max-w-[1100px] px-6 py-24 md:py-36">
        <Eyebrow text={`${works.length} ${copy.works}`} lang={lang} />
        <RichTitle as="h2" text={copy.listTitle} className="mt-5 mb-10 font-heading text-[clamp(2.5rem,5vw,4.5rem)] leading-tight" />
        <HomeList works={showcaseWorks} lang={lang} />
      </Reveal>
      <Reveal className="mx-3 mb-3 overflow-hidden rounded-[28px] bg-[var(--tone-teal-ink)] px-6 py-16 text-[var(--on-photo)] md:px-16 md:py-20">
        <div data-surface="photo" className="mx-auto grid max-w-[1150px] items-center gap-12 md:min-h-[440px] md:grid-cols-[1.1fr_1fr]">
          <div>
            <Eyebrow text={copy.mobile} lang={lang} />
            <RichTitle as="h2" text={copy.mobileTitle} className="mt-5 font-heading text-[clamp(3rem,6vw,6rem)] font-light leading-[1.02]" />
            <p className="mt-6 text-lg">{copy.mobileBody}</p>
            <Button asChild variant="cream" size="lg" arrow className="mt-8">
              <a href="https://github.com/kokkodhackathon/Sezi/releases/latest">{copy.download}</a>
            </Button>
          </div>
          {hero && heroPhoto && (
            <div className="relative mx-auto -mb-32 w-[min(290px,80vw)] rotate-[-6deg] overflow-hidden rounded-[46px] border-[10px] border-foreground bg-foreground shadow-xl motion-reduce:rotate-0">
              <Link href={href(lang, `/eser/${hero.slug}`)} className="relative block aspect-[29/60] overflow-hidden rounded-[36px]" aria-label={loc(hero.name, lang)}>
                <Image src={photoUrl(heroPhoto)} alt={loc(heroPhoto.alt, lang)} fill sizes="290px" className="object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-transparent to-foreground/20" />
                <span className="absolute right-5 bottom-10 left-5">
                  <RichTitle as="span" text={copy.hero} className="block font-heading text-4xl font-light leading-tight" />
                  <span className="mt-5 block text-sm">{loc(hero.name, lang)}</span>
                </span>
              </Link>
              <div className="absolute top-4 right-4">
                <PhotoSource photo={heroPhoto} align="end" side="bottom" />
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </>
  );
}
