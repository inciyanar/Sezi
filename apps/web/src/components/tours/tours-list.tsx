"use client";

import { coverOf, formatDistance, isAttributed, loc, planTour, TOUR_BADGES, walkingSpeed, type Tour } from "@sezi/shared";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BadgeArt } from "@/components/account/badge-art";
import { BADGE_NAME } from "@/components/account/social-visuals";
import { ProfileSelect, resolveProfileChoice, resolveUserProfile, type ProfileChoice } from "@/components/route/profile-select";
import { Tag } from "@/components/ui/tag";
import { WorkThumb } from "@/components/work-thumb";
import { PhotoSource } from "@/components/works/photo-source";
import type { NavOverlay, WorkListItem } from "@/lib/data";
import { href } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { planner, usePlannerOverlay } from "@/lib/pilot";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function ToursList({ tours, overlay, works, initialProfile }: { tours: Tour[]; overlay: NavOverlay; works: WorkListItem[]; initialProfile?: string }) {
  const { t, lang } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const savedProfile = useProfile();
  const version = usePlannerOverlay(overlay);
  const [explicitProfile, setExplicitProfile] = useState<ProfileChoice | null>(() => initialProfile ? resolveProfileChoice(initialProfile, true) : null);
  const [filter, setFilter] = useState<"all" | "stepFree" | "short">("all");
  const [city, setCity] = useState<string | null>(null);
  const profileChoice: ProfileChoice = explicitProfile ? resolveProfileChoice(explicitProfile, savedProfile !== null) : savedProfile ? "benim" : "walker";
  const activeProfile = useMemo(() => resolveUserProfile(profileChoice, savedProfile, lang), [profileChoice, savedProfile, lang]);
  const worksBySlug = useMemo(() => new Map(works.map((work) => [work.slug, work])), [works]);
  const plans = useMemo(() => tours.flatMap((tour) => {
    const plan = planTour(planner, tour, activeProfile, planner.defaultStart());
    return plan && plan.stops.length ? [{ tour, plan, minutes: Math.max(1, Math.ceil(plan.lengthM / walkingSpeed(activeProfile) / 60)) }] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [tours, activeProfile, version]);
  const cities = [...new Set(plans.map(({ tour }) => tour.citySlug))];
  const visible = plans.filter(({ tour, plan, minutes }) => (!city || city === tour.citySlug) && (filter === "all" || (filter === "stepFree" ? plan.stairs === 0 : minutes < 60)));
  const defaultChoice: ProfileChoice = savedProfile ? "benim" : "walker";
  const profileQuery = profileChoice !== defaultChoice ? `?profil=${profileChoice}` : "";
  const chip = (selected: boolean) => cn("min-h-12 rounded-full px-5 text-sm font-bold", selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground");

  return <div className="grid gap-8">
    <ProfileSelect value={profileChoice} onChange={(next) => { setExplicitProfile(next); router.replace(`${pathname}${next !== defaultChoice ? `?profil=${next}` : ""}`, { scroll: false }); }} />
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("tours.filters")}>
      {(["all", "stepFree", "short"] as const).map((item) => <button key={item} type="button" className={chip(filter === item)} aria-pressed={filter === item} onClick={() => setFilter(item)}>{t(item === "all" ? "tours.all" : item === "short" ? "tours.short" : "tours.stepFree")}</button>)}
    </div>
    {cities.length > 1 ? <div className="flex flex-wrap gap-2">{[null, ...cities].map((slug) => <button key={slug ?? "all"} type="button" className={chip(city === slug)} aria-pressed={city === slug} onClick={() => setCity(slug)}>{slug ? loc(works.find((work) => work.city_slug === slug)?.city_name, lang) || slug : t("tours.all")}</button>)}</div> : null}
    {visible.length === 0 ? <p className="py-12 text-center text-muted-foreground">{t("tours.none")}</p> : <div className="grid gap-4 md:grid-cols-3">
      {visible.map(({ tour, plan, minutes }, index) => {
        const work = worksBySlug.get(plan.stops[0]!.slug);
        const photo = work ? coverOf(work) : undefined;
        const badge = TOUR_BADGES[tour.slug];
        return <article key={tour.slug} data-surface="photo" className={cn("group relative flex min-h-[400px] flex-col overflow-hidden rounded-[28px] bg-foreground text-[var(--on-photo)]", index === 0 && "md:col-span-2")}>
          <WorkThumb photo={photo} typeSlug={work?.type_slug ?? plan.stops[0]!.type} alt={photo ? loc(photo.alt, lang) : ""} className={cn("absolute inset-0 size-full", !photo && "tour-placeholder")} sizes="(min-width: 768px) 66vw, 100vw" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/10 to-black/90 contrast:bg-black/80" />
          <Link href={href(lang, `/turlar/${tour.slug}${profileQuery}`)} className="relative z-10 flex min-h-[400px] flex-1 flex-col p-6 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ring">
            <div className="flex items-center justify-between gap-4"><span className="text-[13px] font-bold tracking-[0.16em]">{work?.district?.toLocaleUpperCase(lang) ?? ""}</span><span className="grid size-12 place-items-center rounded-full bg-[var(--on-photo)] text-foreground"><ArrowUpRight aria-hidden /></span></div>
            {badge ? <span className="mt-2 flex w-fit items-center gap-2 rounded-full bg-[var(--glass-dark)] pr-3 text-sm font-bold"><BadgeArt id={badge} size={30} />{t("tours.badge", { name: t(BADGE_NAME[badge]) })}</span> : null}
            <div className="mt-auto grid gap-3 pt-12"><h2 className="font-heading text-[clamp(32px,3.6vw,52px)] leading-[1.02] tracking-[-0.03em]">{loc(tour.title, lang)}</h2><p className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold"><span>{t("tours.stops", { n: plan.stops.length })}</span><span>{t("tours.distance", { distance: formatDistance(plan.lengthM, lang) })}</span><span>{t("tours.walk", { n: minutes })}</span></p><span><Tag tone={plan.stairs === 0 ? "ok" : "neutral"}>{plan.stairs === 0 ? t("tours.stepFree") : t("tours.stairs", { n: plan.stairs })}</Tag></span></div>
          </Link>
          {photo && isAttributed(photo) ? <div className="absolute right-4 bottom-4 z-20"><PhotoSource photo={photo} align="end" side="top" /></div> : null}
        </article>;
      })}
    </div>}
  </div>;
}
