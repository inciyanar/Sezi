"use client";

import { CatIcon, ContrastIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/account/avatar";
import { BottomNav } from "@/components/bottom-nav";
import { BrandMark } from "@/components/brand-mark";
import { SiteSearch } from "@/components/site-search";
import { useAccount } from "@/lib/account";
import { setAppearance, TEXT_SIZES, useAppearance } from "@/lib/appearance";
import { href, type MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { useIdentity } from "@/lib/identity";
import { useSlidingBox } from "@/lib/use-sliding-box";
import { cn } from "@/lib/utils";

const LINKS: { path: string; label: MessageKey }[] = [
  { path: "", label: "nav.explore" },
  { path: "/eserler", label: "nav.works" },
  { path: "/turlar", label: "nav.tours" },
  { path: "/rota", label: "nav.route" },
  { path: "/hesap/pasaport", label: "nav.passport" },
];

function useActive() {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(tr|en)(?=\/|$)/, "");
  return {
    pathname,
    rest,
    isActive: (path: string) => {
      if (path === "") return rest === "" || rest === "/";
      if (path === "/eserler") return rest === "/eserler" || rest.startsWith("/eser/") || rest.startsWith("/il/") || rest.startsWith("/kulliye/");
      return rest === path || rest.startsWith(`${path}/`);
    },
  };
}

const ICON_BTN_BASE =
  "relative grid size-11 place-items-center rounded-full text-[13px] font-bold transition-colors duration-200 after:absolute after:-inset-1 focus-visible:ring-3 focus-visible:ring-ring/50";
const ICON_BTN_GLASS =
  "border border-[color-mix(in_srgb,var(--on-photo)_24%,transparent)] bg-[color-mix(in_srgb,var(--on-photo)_14%,transparent)] text-[var(--on-photo)] backdrop-blur-[14px] hover:bg-[color-mix(in_srgb,var(--on-photo)_22%,transparent)] contrast:border-2 contrast:border-current contrast:bg-foreground contrast:backdrop-blur-none";
const ICON_BTN_SOLID =
  "border border-transparent bg-secondary text-foreground hover:bg-border/60 contrast:border-2 contrast:border-border";

/**
 * Görünüm: yüksek kontrast, Sezi kedisi (gizlenebilir) ve üç yazı boyutu (her seçenek kendi boyutunda "A").
 * Açılır pencere tetikleyiciden açılır; değişiklik hemen uygulanır.
 */
function AppearanceMenu({ solid }: { solid: boolean }) {
  const { t } = useT();
  const a = useAppearance();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("appearance.open")}
          title={t("appearance.open")}
          className={cn(ICON_BTN_BASE, solid ? ICON_BTN_SOLID : ICON_BTN_GLASS)}
        >
          <span aria-hidden>Aa</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-0 p-2">
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg px-2 hover:bg-muted">
          <span className="flex items-center gap-2.5 text-sm font-semibold">
            <ContrastIcon className="size-4" aria-hidden />
            {t("appearance.contrast")}
          </span>
          <Switch checked={a.contrast} onCheckedChange={(v) => setAppearance({ contrast: v })} />
        </label>
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg px-2 hover:bg-muted">
          <span className="flex items-center gap-2.5 text-sm font-semibold">
            <CatIcon className="size-4" aria-hidden />
            {t("appearance.cat")}
          </span>
          <Switch checked={a.cat} onCheckedChange={(v) => setAppearance({ cat: v })} />
        </label>
        <div className="px-2 pt-2 pb-1">
          <p id="text-size-label" className="pb-2 text-sm font-semibold">
            {t("appearance.text")}
          </p>
          <div role="radiogroup" aria-labelledby="text-size-label" className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
            {TEXT_SIZES.map((s, i) => {
              const on = a.text === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={t(`appearance.text.${s}`)}
                  onClick={() => setAppearance({ text: s })}
                  className={cn(
                    "flex min-h-12 items-end justify-center rounded-lg pb-2.5 font-bold leading-none transition-[background-color,transform] duration-150 ease-out active:scale-[0.97]",
                    on ? "bg-card text-foreground shadow-sm contrast:outline-2 contrast:outline-border" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span style={{ fontSize: `${0.875 + i * 0.25}rem` }} aria-hidden>
                    A
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LangSwitch({ solid }: { solid: boolean }) {
  const { t, lang } = useT();
  const { rest } = useActive();
  const other = lang === "tr" ? "en" : "tr";
  return (
    <Link
      href={href(other, rest)}
      hrefLang={other}
      lang={other}
      aria-label={t("nav.langLabel")}
      className={cn(ICON_BTN_BASE, solid ? ICON_BTN_SOLID : ICON_BTN_GLASS)}
    >
      {t("nav.lang")}
    </Link>
  );
}

/** Hesap düğmesi: girişsizken "Giriş yap", girişliyken avatar + ad → pasaport sayfası. */
function AccountLink({ solid }: { solid: boolean }) {
  const { t, lang } = useT();
  const { ready, user } = useAccount();
  const { identity, avatar } = useIdentity();
  if (!ready) return <span className="inline-block h-11 w-24" aria-hidden />;
  if (!user) {
    return (
      <Link
        href={href(lang, "/hesap/giris")}
        className={cn(
          "relative inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-bold transition-colors duration-200 after:absolute after:-inset-y-1 after:inset-x-0",
          solid
            ? "bg-primary text-primary-foreground hover:opacity-92 contrast:outline-2 contrast:outline-border"
            : "bg-[var(--on-photo)] text-foreground hover:opacity-92 contrast:outline-2 contrast:outline-current",
        )}
      >
        <UserRoundIcon className="size-4" aria-hidden />
        {t("nav.signIn")}
      </Link>
    );
  }
  const name = identity?.display_name || user.email || t("nav.account");
  return (
    <Link
      href={href(lang, "/hesap/pasaport")}
      aria-label={`${t("nav.account")}: ${name}`}
      className={cn(
        "relative inline-flex h-11 items-center gap-2 rounded-full py-0 pr-3.5 pl-1 text-[14px] font-bold transition-colors duration-200 after:absolute after:-inset-y-1 after:inset-x-0",
        solid
          ? "bg-secondary text-foreground hover:bg-border/60 contrast:outline-2 contrast:outline-border"
          : "bg-[var(--on-photo)] text-foreground hover:opacity-92 contrast:outline-2 contrast:outline-current",
      )}
    >
      <Avatar identity={identity} src={avatar} size={36} />
      <span className="max-w-32 truncate">{name}</span>
    </Link>
  );
}

/**
 * Üst menü: fotoğraf bandının en tepesindeyken taslaktaki gibi bandın içinde yüzer (`.nav` + `.glass` haplar);
 * aşağı kaydırılınca veya bantsız sayfalarda üst kenara tam oturan sıcak buzlu kâğıt şeridine dönüşür.
 */
export function SiteHeader() {
  const { t, lang } = useT();
  const { rest, isActive } = useActive();
  const navRef = useRef<HTMLElement>(null);
  const active = LINKS.findIndex((l) => isActive(l.path));
  const [hovered, setHovered] = useState<number | null>(null);
  const pill = useSlidingBox(navRef, "a", hovered ?? active, [lang, rest]);
  const [solid, setSolid] = useState(true);

  useEffect(() => {
    const band = document.querySelector<HTMLElement>("[data-band]");
    const routeMap = document.querySelector<HTMLElement>("[data-route-map]");
    if (routeMap || !band || band.dataset.band === "solid") {
      setSolid(true);
      return;
    }
    const update = () => setSolid(window.scrollY > 24 || band.getBoundingClientRect().bottom <= 80);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [rest]);

  return (
    <>
      <header
        data-scrolled={solid}
        className={cn(
          "group/header fixed inset-x-0 top-0 z-50 border-b px-4 py-4 transition-colors duration-200 min-[900px]:px-[34px]",
          solid
            ? "border-border/70 bg-background/95 text-foreground backdrop-blur-[18px] contrast:border-b-2 contrast:border-border contrast:bg-background contrast:backdrop-blur-none"
            : "border-transparent text-[var(--on-photo)]",
        )}
      >
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
        >
          {t("nav.skip")}
        </a>
        <div className="mx-auto grid grid-cols-[1fr_auto] items-center gap-3 min-[1200px]:grid-cols-[1fr_auto_1fr]">
          <Link
            href={href(lang)}
            className={cn(
              "inline-flex min-h-12 items-center gap-2.5 justify-self-start font-heading text-[28px] font-normal leading-none tracking-[-0.02em] transition-colors duration-200",
              solid ? "text-[var(--brand-mark)]" : "text-[var(--on-photo)]",
            )}
            aria-label={t("nav.home")}
          >
            <BrandMark className="h-[26px] w-auto" />
            {t("site.name")}
          </Link>
          <nav
            ref={navRef}
            aria-label={t("nav.main")}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "relative hidden items-center gap-1 justify-self-center rounded-full border border-transparent p-1 transition-colors duration-200 min-[1200px]:flex",
              solid
                ? "bg-secondary text-muted-foreground contrast:outline-2 contrast:outline-border"
                : "border border-[color-mix(in_srgb,var(--on-photo)_24%,transparent)] bg-[color-mix(in_srgb,var(--on-photo)_14%,transparent)] text-[var(--on-photo)] backdrop-blur-[14px] contrast:border-2 contrast:border-current contrast:bg-foreground contrast:backdrop-blur-none",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-1 left-0 rounded-full transition-[transform,width,opacity] duration-200 ease-out motion-reduce:transition-none",
                solid ? "bg-foreground" : "bg-[var(--on-photo)]",
                pill ? "opacity-100" : "opacity-0",
              )}
              style={pill ? { width: pill.width, transform: `translateX(${pill.left}px)` } : undefined}
            />
            {LINKS.map((l, i) => {
              const on = (hovered ?? active) === i;
              return (
                <Link
                  key={l.path}
                  href={href(lang, l.path)}
                  aria-current={isActive(l.path) ? "page" : undefined}
                  onMouseEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  className={cn(
                    "relative z-10 inline-flex min-h-12 items-center rounded-full px-4 text-[14px] font-bold leading-none transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    on && !pill && (solid ? "bg-foreground" : "bg-[var(--on-photo)]"),
                    on
                      ? solid
                        ? "text-[var(--on-photo)]"
                        : "text-foreground"
                      : solid
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-[var(--on-photo)]",
                  )}
                >
                  {t(l.label)}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 justify-self-end">
            <SiteSearch className={cn(ICON_BTN_BASE, solid ? ICON_BTN_SOLID : ICON_BTN_GLASS)} />
            <AppearanceMenu solid={solid} />
            <LangSwitch solid={solid} />
            <div className="hidden min-[1200px]:block">
              <AccountLink solid={solid} />
            </div>
          </div>
        </div>
      </header>
      <BottomNav rest={rest} />
    </>
  );
}
