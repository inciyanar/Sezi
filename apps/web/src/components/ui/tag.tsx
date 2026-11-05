import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type TagTone = "neutral" | "ok" | "warn" | "ink" | "line";

const TONES: Record<TagTone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  ok: "bg-success text-success-foreground",
  warn: "bg-warning text-warning-foreground",
  ink: "bg-primary text-primary-foreground",
  line: "border border-current bg-transparent",
};

/**
 * Küçük durum etiketi (hap): "Basamaksız", "UNESCO", "Konum yaklaşık". Renk tek başına anlam taşımaz;
 * etiket her zaman metin içerir. Yüksek kontrastta çerçeveyle ayrılır.
 */
export function Tag({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: TagTone }) {
  return (
    <span
      data-slot="tag"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] leading-none font-bold whitespace-nowrap contrast:outline-2 contrast:-outline-offset-2 contrast:outline-foreground [&>svg]:size-3.5 [&>svg]:shrink-0",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
