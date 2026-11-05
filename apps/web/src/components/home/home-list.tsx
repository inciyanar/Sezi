"use client";

import { coverOf, loc } from "@sezi/shared";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRightIcon } from "lucide-react";
import { WorkThumb } from "@/components/work-thumb";
import { Button } from "@/components/ui/button";
import type { WorkListItem } from "@/lib/data";
import { href } from "@/lib/i18n";

export function HomeList({ works, lang }: { works: WorkListItem[]; lang: "tr" | "en" }) {
  const [filter, setFilter] = useState("");
  const counts = new Map<string, number>();
  for (const work of works) {
    const name = loc(work.type_name, lang);
    if (name && coverOf(work)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const types = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4);
  const shown = works.filter((w) => coverOf(w) && (!filter || loc(w.type_name, lang) === filter)).slice(0, 5);
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label={lang === "tr" ? "Eser türü" : "Work type"}>
        {["", ...types.map(([name]) => name)].map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={filter === name}
            onClick={() => setFilter(name)}
            className={`min-h-12 rounded-full px-5 font-bold ${filter === name ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
          >
            {name || (lang === "tr" ? "Tümü" : "All")}
          </button>
        ))}
      </div>
      <div className="border-t border-border">
        {shown.map((work) => (
          <Link key={work.slug} href={href(lang, `/eser/${work.slug}`)} className="group grid grid-cols-[80px_minmax(0,1fr)_44px] items-center gap-x-3 gap-y-1 border-b border-border py-[18px] sm:gap-x-5 md:grid-cols-[80px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_44px]">
            <WorkThumb
              photo={coverOf(work)}
              typeSlug={work.type_slug}
              alt={loc(coverOf(work)?.alt, lang)}
              className="relative row-span-2 h-[58px] w-20 overflow-hidden rounded-[14px] md:row-span-1"
              sizes="80px"
            />
            <span className="min-w-0 font-heading text-xl leading-tight tracking-[-0.02em] group-hover:italic sm:text-[26px]">{loc(work.name, lang)}</span>
            <span className="col-start-2 min-w-0 text-sm text-muted-foreground md:col-auto">
              <span className="inline-block rounded-full bg-secondary px-3 py-1 font-bold text-secondary-foreground">{loc(work.type_name, lang)}</span>
              <span className="ml-2 md:hidden">{[work.district, loc(work.city_name, lang)].filter(Boolean).join(", ")}</span>
            </span>
            <span className="hidden min-w-0 text-muted-foreground md:block">{[work.district, loc(work.city_name, lang)].filter(Boolean).join(", ")}</span>
            <span className="col-start-3 row-span-2 row-start-1 grid size-11 place-items-center rounded-full border border-border group-hover:border-foreground group-hover:bg-foreground group-hover:text-background md:col-auto md:row-span-1 md:row-auto">
              <ArrowUpRightIcon aria-hidden className="size-4" />
            </span>
          </Link>
        ))}
      </div>
      <Button asChild variant="line" className="mt-8">
        <Link href={href(lang, "/eserler")}>{lang === "tr" ? "Tüm eserler" : "All works"}</Link>
      </Button>
    </div>
  );
}
