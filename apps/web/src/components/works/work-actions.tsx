"use client";

import { PauseIcon, PlayIcon, RouteIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

/** Karo: simge üstte, kısa etiket altta; satırı eşit böler. Basınca çok hafif küçülür (0.97, 160 ms). */
const tile =
  "flex min-h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-center font-heading text-base font-bold leading-tight outline-none transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus-visible:ring-3 focus-visible:ring-ring contrast:outline-2 contrast:outline-border";

/**
 * Eser sayfasının eylem karoları (mobildeki yer kartıyla aynı): pilot alanda rota planla (ana eylem, dolgu), ses kaydı
 * varsa dinle. Hiçbiri yoksa hiçbir şey çizilmez. Ses tek düğmeyle çalar ve durur; oynatıcı çubuğu gösterilmez.
 */
export function WorkActions({ routeHref, audioSrc, workName }: { routeHref: string | null; audioSrc: string | null; workName: string }) {
  const { t } = useT();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  if (!routeHref && !audioSrc) return null;

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  return (
    <div className="flex gap-3">
      {routeHref ? (
        <Link href={routeHref} className={cn(tile, "bg-primary text-primary-foreground hover:bg-primary/90")}>
          <RouteIcon className="size-6" aria-hidden />
          <span>{t("works.detail.planRoute")}</span>
        </Link>
      ) : null}
      {audioSrc ? (
        <>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={playing}
            aria-label={`${playing ? t("works.detail.stop") : t("works.detail.listen")}: ${workName}, ${t("works.detail.audioTitle")}`}
            className={cn(tile, routeHref ? "bg-secondary text-secondary-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90")}
          >
            {playing ? <PauseIcon className="size-6" aria-hidden /> : <PlayIcon className="size-6" aria-hidden />}
            <span>{playing ? t("works.detail.stop") : t("works.detail.listen")}</span>
          </button>
          <audio
            ref={audio}
            src={audioSrc}
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        </>
      ) : null}
    </div>
  );
}
