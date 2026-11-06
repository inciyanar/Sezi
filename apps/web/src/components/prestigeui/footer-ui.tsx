"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

/** Alt bilginin tek vurgu rengi: Sezi marka işareti (açık/koyu/yüksek kontrastta tema değişkeninden). */
export const accentVars = "[--footer-accent:var(--brand-mark)]";

/** Alt bilgideki her denetimin ortak odak halkası (sitenin `--ring` rengi). */
export const ring =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export type FooterLink = { label: string; href: string };
export type FooterGroup = { title: string; links: FooterLink[] };

/** Alt bilgi bağlantısı: sakin renkte, üzerine gelince tam mürekkep; dokunma alanı en az 48 px. */
export function FooterAnchor({ link, className }: { link: FooterLink; className?: string }) {
  return (
    <Link
      href={link.href}
      className={cn(
        "inline-flex min-h-12 items-center rounded-sm text-[15px] text-muted-foreground transition-colors duration-150 hover:text-foreground",
        ring,
        className,
      )}
    >
      {link.label}
    </Link>
  );
}

/** Bu düğümü kaydıran öğe: bir panel ya da pencere. */
function scrollParent(node: HTMLElement | null): HTMLElement | Window {
  let el = node?.parentElement ?? null;
  while (el && el !== document.body) {
    if (/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY)) return el;
    el = el.parentElement;
  }
  return window;
}

/** Alt bilgiyi kaydıran öğeyi başa döndürür; hareket azaltmada anlık. */
export function scrollToTop(node: HTMLElement | null) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scrollParent(node).scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}
