"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useRef, useState } from "react";

import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

/**
 * Eserin sesli anlatımını çalan ve durduran tek düğme (oynatıcı çubuğu yok). Sol başta altın daire içinde
 * oynat/durdur simgesi; durum `aria-pressed` ve düğme yazısıyla da söylenir. `variant="dark"` koyu bant ve
 * cam üstünde krem yazı, `light` düz zeminde mürekkep yazı.
 */
export function ListenButton({
  src,
  workName,
  label,
  variant = "light",
  className,
}: {
  src: string;
  workName: string;
  /** Görünen yazı; verilmezse "Dinle". */
  label?: string;
  variant?: "light" | "dark";
  className?: string;
}) {
  const { t } = useT();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };
  const text = playing ? t("works.detail.stop") : (label ?? t("works.detail.listen"));

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={`${text}: ${workName}, ${t("works.detail.audioTitle")}`}
        className={cn(
          "inline-flex min-h-12 items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 text-[0.9375rem] font-bold outline-none transition-[scale,background-color] duration-150 ease-out active:scale-[0.97] focus-visible:ring-3 focus-visible:ring-ring contrast:outline-2 contrast:outline-current",
          variant === "dark" ? "bg-[var(--glass-dark)] text-[var(--on-photo)] backdrop-blur-md" : "bg-secondary text-foreground hover:bg-muted",
          className,
        )}
      >
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground">
          {playing ? <PauseIcon className="size-4" fill="currentColor" /> : <PlayIcon className="size-4 translate-x-px" fill="currentColor" />}
        </span>
        <span>{text}</span>
      </button>
      <audio
        ref={audio}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </>
  );
}
