"use client";

import { achievements, BADGE_IDS, badgeFor, EMPTY_CONTRIBUTIONS, passportStats, type Achievement, type LocalizedText, type PassportStats, type PassportTour, type PassportWork, type Visit } from "@sezi/shared";
import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Avatar } from "@/components/account/avatar";
import { BadgeArt } from "@/components/account/badge-art";
import { AchievementGrid, achievementTarget, achievementTitle, BADGE_NAME, sortAchievements, StampGrid } from "@/components/account/social-visuals";
import { Band } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RichTitle } from "@/components/ui/rich-title";
import { href } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { useIdentity } from "@/lib/identity";
import { getCities, getContributions, getPassportCover, getPublicPhotoCount, getTours, getVisits, getWorks } from "@/lib/social";
import { useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/use-async";

export interface PassportData {
  works: PassportWork[];
  tours: PassportTour[];
  visits: Visit[];
  cities: { slug: string; name: LocalizedText }[];
  stats: PassportStats;
  list: Achievement[];
  photoCount: number | null;
  cover: string | null;
}

/**
 * Kendi pasaportunun verisi. Hoş Geldin damgası algısal profilden gelir: profil (uygulamada ya da sitede kurulmuş,
 * hesapla eşitlenmiş) varsa kazanılmıştır; kurulum zamanı yoksa tarihsiz.
 */
export function usePassportData(uid: string | undefined) {
  const profile = useProfile();
  const welcomedAt = profile ? (profile.onboardedAt ?? null) : undefined;
  return useAsync(async () => {
    if (!uid) return null;
    const [works, tours, visits, contributions, cities, photoCount] = await Promise.all([
      getWorks(), getTours(), getVisits(uid), getContributions(uid), getCities(), getPublicPhotoCount(uid),
    ]);
    const cover = visits[0] ? await getPassportCover(visits[0].work_slug) : null;
    return {
      works, tours, visits, cities, photoCount, cover,
      stats: passportStats(visits, works, tours),
      list: achievements({ works, tours, visits, contributions: contributions ?? EMPTY_CONTRIBUTIONS, welcomedAt }),
    };
  }, [uid, welcomedAt]);
}

export function PassportContent({ data, createdAt }: { data: PassportData | null; createdAt?: string }) {
  const { t, lang } = useT();
  const { identity, avatar } = useIdentity();
  const { earned, locked } = sortAchievements(data?.list ?? []);
  const earnedIds = new Set(earned.map(badgeFor));
  const latest = earned[0];
  const visited = data?.stats.cities.filter((city) => city.visited > 0) ?? [];
  const bySlug = new Map(data?.works.map((work) => [work.slug, work]) ?? []);
  const since = createdAt && !Number.isNaN(Date.parse(createdAt))
    ? new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(new Date(createdAt)) : null;
  async function share() {
    const url = new URL(href(lang, "/"), window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: t("passport.shareTitle"), url });
      else { await navigator.clipboard.writeText(url); toast.success(t("passport.linkCopied")); }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(t("passport.shareError"));
    }
  }
  return (
    <>
      <Band size="auto" image={data?.cover} imageClassName="opacity-45" className="min-h-[480px] bg-[var(--glass-dark)]" contentClassName="flex min-h-[480px] items-end">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 pt-36 pb-12 md:grid-cols-2 md:items-end md:px-12">
          <div className="grid gap-8">
            {data ? <div className="flex flex-wrap items-center gap-x-6 gap-y-4"><div className="flex items-center gap-4"><Avatar identity={identity} src={avatar} size={72} /><div><p className="text-lg font-bold">{identity?.display_name}</p>{since ? <p className="text-sm text-on-photo-muted">{t("passport.since", { date: since })}</p> : null}</div></div><Button asChild variant="line" className="min-h-12"><Link href={href(lang, "/hesap")}><SettingsIcon aria-hidden />{t("nav.settings")}</Link></Button></div> : null}
            <RichTitle as="h1" text={t(data ? "passport.hero" : "passport.guestTitle")} className="font-heading text-5xl leading-[1.02] tracking-[-0.03em] md:text-7xl" />
            {!data ? <div className="flex flex-wrap gap-3"><Button asChild variant="cream"><Link href={href(lang, "/hesap/giris")}>{t("account.signIn")}</Link></Button><Button asChild variant="line"><Link href={href(lang, "/hesap/kayit")}>{t("account.signUp")}</Link></Button></div> : null}
          </div>
          {data ? <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">{[
            { value: `${earnedIds.size}/${BADGE_IDS.length}`, label: t("passport.badgeStat") },
            { value: String(data.stats.stamps), label: t("passport.visitedStat") },
            { value: (data.stats.distanceM / 1000).toLocaleString(lang, { maximumFractionDigits: 1 }), label: t("passport.walkedStat") },
            ...(data.photoCount === null ? [] : [{ value: String(data.photoCount), label: t("passport.photoStat") }]),
          ].map((item) => <div key={item.label}><dd className="font-heading text-4xl">{item.value}</dd><dt className="mt-1 text-sm text-on-photo-muted">{item.label}</dt></div>)}</dl> : null}
        </div>
      </Band>
      <div className="mx-auto grid max-w-7xl gap-16 px-6 py-16 md:px-12">
        {earned.length ? <section className="grid gap-6"><h2 className="font-heading text-4xl">{t("ach.earned")}</h2><ul className="flex flex-wrap gap-8">{earned.map((a) => <li key={a.id} className="w-40 text-center"><div className="mx-auto w-fit transition-transform motion-reduce:transition-none [@media(hover:hover)]:hover:rotate-[-6deg] [@media(hover:hover)]:hover:scale-[1.06] motion-reduce:hover:transform-none"><BadgeArt id={badgeFor(a)} size={132} /></div><h3 className="mt-3 font-bold">{achievementTitle(a, t, lang)}</h3><p className="mt-1 text-sm text-muted-foreground">{t(`ach.${a.kind}.body`, { n: achievementTarget(a), name: a.subject?.name[lang] ?? a.subject?.name.tr ?? "" })}</p></li>)}</ul></section> : null}
        <section className="grid gap-6"><h2 className="font-heading text-4xl">{t("ach.next")}</h2>{data ? <AchievementGrid list={locked} /> : <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{BADGE_IDS.map((id) => <li key={id} className="grid justify-items-center gap-3 rounded-[24px] border bg-card p-5 text-center"><BadgeArt id={id} size={84} locked /><span className="font-bold">{t(BADGE_NAME[id])}</span><span className="text-sm text-muted-foreground">{t("ach.locked")}</span></li>)}</ul>}</section>
        {data ? <section className="grid gap-6"><h2 className="font-heading text-4xl">{t("passport.seenWorks")}</h2>{data.stats.stamps ? <StampGrid visits={data.visits} works={bySlug} /> : <p className="text-muted-foreground">{t("passport.emptyInvite")}</p>}{visited.length ? <div className="grid gap-4 rounded-[24px] border bg-card p-6"><h3 className="font-heading text-2xl">{t("passport.cities")}</h3>{visited.map((city) => { const name = data.cities.find((item) => item.slug === city.slug)?.name; return <ProgressBar key={city.slug} value={city.visited} max={city.total} label={name ? (name[lang] ?? name.tr) : city.slug} />; })}</div> : null}</section> : null}
        {latest ? <section className="grid items-center gap-10 rounded-[28px] bg-secondary p-8 md:grid-cols-2 md:p-12"><div><h2 className="font-heading text-4xl">{t("passport.shareTitle")}</h2><p className="mt-4 text-muted-foreground">{t("passport.shareDescription")}</p><Button className="mt-6" onClick={share} arrow>{t("passport.shareButton")}</Button></div><div className="mx-auto flex aspect-[9/16] w-full max-w-64 rotate-3 flex-col items-center justify-center gap-5 rounded-[28px] bg-card p-6 text-center shadow-xl"><BadgeArt id={badgeFor(latest)} size={132} /><p className="text-sm font-bold">{t("passport.newStamp")}</p><h3 className="font-heading text-3xl">{achievementTitle(latest, t, lang)}</h3><span className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground">#Sezdim</span><span className="rounded-full bg-tone-teal px-4 py-2 font-bold text-tone-teal-ink">{t("passport.yourTurn")}</span><small className="text-muted-foreground">sezi.info</small></div></section> : null}
      </div>
    </>
  );
}
