import { FooterWordmark } from "@/components/prestigeui/footer-wordmark";
import { href, t, type Lang } from "@/lib/i18n";

/** Sitenin alt bilgisi: Prestige UI "footer-wordmark" bloğu, Sezi'nin gerçek sayfaları ve metinleriyle. */
export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <FooterWordmark
      brand={t(lang, "site.name")}
      homeHref={href(lang)}
      homeLabel={t(lang, "nav.home")}
      tagline={t(lang, "site.tagline")}
      navLabel={t(lang, "footer.label")}
      groups={[
        {
          title: t(lang, "footer.explore"),
          links: [
            { label: t(lang, "nav.tours"), href: href(lang, "/turlar") },
            { label: t(lang, "nav.route"), href: href(lang, "/rota") },
            { label: t(lang, "nav.exhibitions"), href: href(lang, "/sergiler") },
          ],
        },
        {
          title: t(lang, "footer.about"),
          links: [
            { label: t(lang, "nav.about"), href: href(lang, "/hakkinda") },
            { label: t(lang, "nav.accessibility"), href: href(lang, "/hakkinda#erisilebilirlik") },
            { label: t(lang, "nav.report"), href: href(lang, "/bildirim") },
          ],
        },
      ]}
      notes={[t(lang, "footer.source"), t(lang, "footer.project")]}
      backToTop={t(lang, "footer.backToTop")}
      timeLabel={t(lang, "footer.localTime")}
      city="Bursa"
      timeZone="Europe/Istanbul"
      locale={lang === "tr" ? "tr-TR" : "en-GB"}
    />
  );
}
