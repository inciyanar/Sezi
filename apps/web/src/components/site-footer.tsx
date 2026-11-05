import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { href, t, type Lang } from "@/lib/i18n";

const LINK = "inline-flex min-h-12 items-center font-bold text-link underline";

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="mt-16 px-4 pb-8 pt-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href={href(lang)} aria-label={t(lang, "nav.home")} className="flex items-end gap-[0.15em] font-heading text-[clamp(70px,15vw,230px)] font-normal leading-[.85] tracking-[-0.05em] text-[var(--brand-mark)]">
          <BrandMark className="mb-[0.06em] h-[0.62em] shrink-0" />
          {t(lang, "site.name")}
        </Link>
        <div className="mt-10 flex flex-col gap-x-8 gap-y-2 border-t border-border pt-5 text-sm text-muted-foreground lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <p>© 2026 {t(lang, "site.name")} · {t(lang, "site.tagline")}</p>
          <nav aria-label={t(lang, "nav.about")} className="flex flex-wrap gap-x-5">
            <Link className={LINK} href={href(lang, "/turlar")}>{t(lang, "nav.tours")}</Link>
            <Link className={LINK} href={href(lang, "/rota")}>{t(lang, "nav.route")}</Link>
            <Link className={LINK} href={href(lang, "/sergiler")}>{t(lang, "nav.exhibitions")}</Link>
            <Link className={LINK} href={href(lang, "/hakkinda")}>{t(lang, "nav.about")}</Link>
            <Link className={LINK} href={href(lang, "/bildirim")}>{t(lang, "nav.report")}</Link>
            <Link className={LINK} href={href(lang, "/hakkinda#erisilebilirlik")}>{t(lang, "nav.accessibility")}</Link>
          </nav>
          <p>{t(lang, "footer.source")}</p>
          <p>{t(lang, "footer.project")}</p>
        </div>
      </div>
    </footer>
  );
}
