"use client";

import { BookOpenIcon, CompassIcon, MapIcon, RouteIcon, StampIcon } from "lucide-react";
import Link from "next/link";
import { useRef, type ReactNode } from "react";

import { href, type MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { useSlidingBox } from "@/lib/use-sliding-box";
import { cn } from "@/lib/utils";

/** Telefon ve tablette erişilebilir, koyu cam sekme çubuğu. */
export function BottomNav({ rest }: { rest: string }) {
  const { t, lang } = useT();
  const ref = useRef<HTMLElement>(null);
  const tabs: { path: string; label: MessageKey; icon: ReactNode }[] = [
    { path: "", label: "nav.explore", icon: <CompassIcon className="size-5" aria-hidden /> },
    { path: "/eserler", label: "nav.works", icon: <BookOpenIcon className="size-5" aria-hidden /> },
    { path: "/turlar", label: "nav.tours", icon: <MapIcon className="size-5" aria-hidden /> },
    { path: "/rota", label: "nav.route", icon: <RouteIcon className="size-5" aria-hidden /> },
    { path: "/hesap/pasaport", label: "nav.passport", icon: <StampIcon className="size-5" aria-hidden /> },
  ];
  const active = tabs.findIndex((tab) => tab.path === "" ? rest === "" || rest === "/" : rest === tab.path || rest.startsWith(`${tab.path}/`));
  const box = useSlidingBox(ref, "a", active, [lang]);

  return (
    <nav ref={ref} aria-label={t("nav.main")} className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-lg rounded-full bg-[var(--glass-dark)] p-1.5 text-[var(--glass-dark-fg)] backdrop-blur-[26px] backdrop-saturate-[.85] contrast:backdrop-filter-none contrast:outline-2 contrast:outline-current min-[1200px]:hidden">
      {box ? (
        <span aria-hidden className="absolute inset-y-1.5 left-0 rounded-full bg-[var(--nav-active)] transition-[transform,width] duration-300 motion-reduce:transition-none contrast:outline-2 contrast:outline-current" style={{ width: box.width, transform: `translateX(${box.left}px)` }} />
      ) : null}
      {tabs.map((tab, i) => (
        <Link key={tab.path || "home"} href={href(lang, tab.path)} aria-current={i === active ? "page" : undefined} className={cn("relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50", i === active ? "font-bold text-[var(--on-photo)] [&_svg]:text-[var(--on-photo-accent)]" : "font-semibold text-[var(--glass-dark-muted)]")}>
          {tab.icon}
          {t(tab.label)}
        </Link>
      ))}
    </nav>
  );
}
