"use client";

import { coverOf, formatDistance, isAttributed, loc, planTour, profileFor, walkingSpeed, type Tour } from "@sezi/shared";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { useMemo } from "react";

import { WorkThumb } from "@/components/work-thumb";
import { PhotoSource } from "@/components/works/photo-source";
import type { NavOverlay, WorkListItem } from "@/lib/data";
import { href } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { planner, usePlannerOverlay } from "@/lib/pilot";

export function TourPreview({ tour, works, overlay, lang }: { tour: Tour; works: WorkListItem[]; overlay: NavOverlay; lang: "tr" | "en" }) {
  const { t } = useT();
  const version = usePlannerOverlay(overlay);
  const profile = useMemo(() => profileFor("walker", lang), [lang]);
  const plan = useMemo(() => planTour(planner, tour, profile, planner.defaultStart()), [tour, profile, version]);
  if (!plan || plan.stops.length === 0) return null;

  const first = plan.stops[0]!;
  const work = works.find((item) => item.slug === first.slug);
  const photo = work ? coverOf(work) : undefined;
  const points = plan.stops.flatMap((stop) => {
    const item = works.find((candidate) => candidate.slug === stop.slug);
    const location = item?.lng != null && item.lat != null ? [item.lng, item.lat] : planner.landmarkNodeForWork(stop.slug)?.location;
    return location ? [{ x: location[0]!, y: location[1]!, name: loc(stop.name, lang), slug: stop.slug }] : [];
  });
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  const normalized = points.map((point) => ({
    ...point,
    x: spanX ? 20 + (60 * (point.x - minX)) / spanX : 50,
    y: spanY ? 82 - (64 * (point.y - minY)) / spanY : 50,
  }));
  const minutes = Math.max(1, Math.ceil(plan.lengthM / walkingSpeed(profile) / 60));

  return (
    <article data-surface="photo" className="relative isolate aspect-[5/4] w-full min-w-0 overflow-hidden rounded-[28px] bg-foreground text-on-photo">
      <WorkThumb
        photo={photo}
        typeSlug={work?.type_slug ?? first.type}
        alt={photo ? loc(photo.alt, lang) || loc(first.name, lang) : ""}
        className="absolute inset-0 -z-10 size-full"
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-foreground/60 contrast:bg-foreground/80" />
      <Link
        href={href(lang, `/turlar/${tour.slug}`)}
        className="flex size-full flex-col justify-end p-4 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ring sm:p-6"
      >
        <div className="absolute inset-x-0 top-0 bottom-[34%]" aria-hidden>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
            {normalized.length > 1 ? (
              <polyline
                points={normalized.map(({ x, y }) => `${x},${y}`).join(" ")}
                fill="none"
                stroke="var(--on-photo)"
                strokeWidth="2.4"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </svg>
          {normalized.map(({ x, y, name, slug }, index) => (
            <span key={slug} className="absolute w-28 -translate-x-1/2 text-center text-xs font-bold leading-tight text-on-photo" style={{ left: `${x}%`, top: `${y}%` }}>
              <span className="absolute left-1/2 top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-on-photo" />
              {(index === 0 || index === normalized.length - 1 || index === Math.floor(normalized.length / 2)) && (
                <span className="mt-2 inline-block rounded bg-foreground/70 px-1.5 py-0.5">{name}</span>
              )}
            </span>
          ))}
        </div>
        <span className="sr-only">{plan.stops.map((stop) => loc(stop.name, lang)).join(", ")}</span>
        <div className="relative flex items-center justify-between gap-4 rounded-[20px] bg-[var(--glass-light)] p-4 text-[var(--glass-light-fg)] backdrop-blur-[26px] contrast:backdrop-blur-none sm:px-5">
          <div className="min-w-0">
            <h3 className="font-heading text-2xl font-normal leading-[1.02] tracking-[-0.03em]">{loc(tour.title, lang)}</h3>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold">
              <span>{t("tours.stops", { n: plan.stops.length })}</span>
              <span>{t("tours.distance", { distance: formatDistance(plan.lengthM, lang) })}</span>
              <span>{t("tours.walk", { n: minutes })}</span>
            </p>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground"><ArrowUpRightIcon aria-hidden className="size-4" /></span>
        </div>
      </Link>
      {photo && isAttributed(photo) ? (
        <div className="absolute right-4 top-4">
          <PhotoSource photo={photo} align="end" side="bottom" className="size-12 max-w-12 rounded-full p-0 before:text-lg before:content-['©'] [&>span]:hidden" />
        </div>
      ) : null}
    </article>
  );
}
