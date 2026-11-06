"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowUp } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { FooterAnchor, accentVars, ring, scrollToTop, type FooterGroup } from "@/components/prestigeui/footer-ui";
import { cn } from "@/lib/utils";

/** Prestige UI "footer-wordmark" bloğunun Sezi uyarlaması; metinler çağırandan (TR/EN) gelir. */
type FooterWordmarkProps = {
  brand: string;
  homeHref: string;
  homeLabel: string;
  tagline: string;
  groups: FooterGroup[];
  /** Alt satırdaki kaynak ve proje atfı. */
  notes: string[];
  navLabel: string;
  backToTop: string;
  /** Saat etiketi, `{time}` yer tutuculu (ör. "Bursa'da saat {time}"). */
  timeLabel: string;
  city: string;
  /** Canlı saatin IANA saat dilimi. */
  timeZone: string;
  locale: string;
  className?: string;
};

const minuteStore = {
  subscribe(callback: () => void) {
    const id = window.setInterval(callback, 15_000);
    return () => window.clearInterval(id);
  },
};

function useClock(timeZone: string, locale: string) {
  return React.useSyncExternalStore(
    minuteStore.subscribe,
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date()),
    () => "",
  );
}

/**
 * Marka adı kenardan kenara: boyutu ölçülen genişlikten hesaplanır, her ekranda satırı tam doldurur. Görünür olunca
 * aşağıdan yükselir; imleç harflerin üstünde yumuşak bir ışık gezdirir. Hareket azaltmada ikisi de kapalıdır.
 */
function Wordmark({ text }: { text: string }) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = measureRef.current;
    if (!box || !measure) return;
    // Boyut doğrudan öğeye yazılır: pencere boyu değişince React yeniden çizmez.
    const fit = () => {
      // 100 px'teki genişlik. Negatif harf aralığı son harften sonra da uygulandığından ölçüme geri eklenir.
      const natural = measure.getBoundingClientRect().width + 6.5;
      if (natural <= 6.5) return;
      box.style.setProperty("--wordmark-size", `${(box.clientWidth / natural) * 100}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    document.fonts?.ready.then(fit).catch(() => {});
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(box);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [text]);

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--wx", `${event.clientX - box.left}px`);
    event.currentTarget.style.setProperty("--wy", `${event.clientY - box.top}px`);
  };

  const letters =
    "block whitespace-nowrap text-center font-heading font-normal leading-[0.8] tracking-[-0.065em] [font-size:var(--wordmark-size,18vw)]";

  return (
    <div
      ref={boxRef}
      aria-hidden
      onPointerMove={move}
      className="group/wm relative overflow-hidden select-none [--wx:50%] [--wy:0px]"
      // Büyük alt bilgi işaretleri gibi alt uzantılarından kesilir.
      style={{ height: "calc(var(--wordmark-size, 18vw) * 0.7)" }}
    >
      <span ref={measureRef} className="invisible absolute top-0 left-0 whitespace-nowrap font-heading font-normal tracking-[-0.065em] [font-size:100px]">
        {text}
      </span>
      <div
        className={cn(
          "pt-[0.06em] transition-[transform,opacity] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none [font-size:var(--wordmark-size,18vw)]",
          shown ? "translate-y-0 opacity-100" : "translate-y-[18%] opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        )}
      >
        <div className="relative">
          {/* Duran mürekkep: sayfaya doğru solar. */}
          <span
            className={cn(letters, "bg-clip-text text-transparent")}
            style={{
              backgroundImage:
                "linear-gradient(to bottom, color-mix(in oklab, var(--footer-accent) 30%, transparent), color-mix(in oklab, var(--footer-accent) 6%, transparent) 85%)",
            }}
          >
            {text}
          </span>
          {/* Yalnız imlecin çevresinde görünen parlak kopya. */}
          <span
            className={cn(
              letters,
              "absolute inset-0 bg-clip-text text-transparent opacity-0 transition-opacity duration-500 group-hover/wm:opacity-100 motion-reduce:hidden",
            )}
            style={{
              backgroundImage:
                "linear-gradient(to bottom, color-mix(in oklab, var(--footer-accent) 85%, transparent), color-mix(in oklab, var(--footer-accent) 40%, transparent) 90%)",
              WebkitMaskImage: "radial-gradient(240px circle at var(--wx) var(--wy), #000, transparent 70%)",
              maskImage: "radial-gradient(240px circle at var(--wx) var(--wy), #000, transparent 70%)",
            }}
          >
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}

function FooterWordmark({
  brand,
  homeHref,
  homeLabel,
  tagline,
  groups,
  notes,
  navLabel,
  backToTop,
  timeLabel,
  city,
  timeZone,
  locale,
  className,
}: FooterWordmarkProps) {
  const footerRef = React.useRef<HTMLElement>(null);
  const time = useClock(timeZone, locale);

  return (
    <footer ref={footerRef} className={cn("mt-16 w-full overflow-hidden border-t border-border bg-background text-foreground print:hidden", accentVars, className)}>
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
          <div className="flex flex-col items-start">
            <Link
              href={homeHref}
              aria-label={homeLabel}
              className={cn("inline-flex min-h-12 items-center gap-2.5 rounded-md font-heading text-2xl tracking-[-0.02em] text-brand-mark", ring)}
            >
              <BrandMark className="h-5" />
              {brand}
            </Link>
            <p className="mt-3 max-w-[34ch] text-[15px] leading-[1.6] text-pretty text-muted-foreground">{tagline}</p>
          </div>

          <nav aria-label={navLabel} className="grid grid-cols-2 gap-x-6 gap-y-8">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-bold">{group.title}</p>
                <ul className="mt-2 flex flex-col">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <FooterAnchor link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border py-5 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1">
            <p>© 2026 {brand}</p>
            {notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {time ? (
              <span className="tabular-nums" aria-label={timeLabel.replace("{time}", time)}>
                {city} {time}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => scrollToTop(footerRef.current)}
              className={cn("group inline-flex min-h-12 cursor-pointer items-center gap-1.5 rounded-sm transition-colors hover:text-foreground", ring)}
            >
              {backToTop}
              <ArrowUp aria-hidden className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-4">
        <Wordmark text={brand} />
      </div>
    </footer>
  );
}

export { FooterWordmark, type FooterWordmarkProps };
