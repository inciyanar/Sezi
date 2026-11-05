import Image from "next/image";
import type { ReactNode } from "react";

import { Glass } from "@/components/ui/glass";
import { cn } from "@/lib/utils";

const SIZE = {
  hero: "min-h-[680px] h-[calc(100dvh-24px)]",
  short: "min-h-[460px] h-[62vh]",
  auto: "",
} as const;

/**
 * Fotoğraflı başlık bandı: kenarlardan 12 px içeride, 28 px köşeli; fotoğrafın üstünde dört duraklı koyu perde,
 * yazı krem (`--on-photo`) ve italik vurgu altın. Yüksek kontrastta perde opak siyaha yakın olur.
 * Sayfanın üst menüsü bandın yüksekliğini `data-band` ile izler: bandın üstündeyken saydam, geçince katı.
 * Fotoğraf yoksa koyu zemin kalır (uydurma görsel konmaz).
 */
export function Band({
  image,
  alt = "",
  credit,
  size,
  className,
  contentClassName,
  imageClassName,
  priority = true,
  children,
}: {
  image?: string | null;
  alt?: string;
  credit?: string | null;
  size: keyof typeof SIZE;
  className?: string;
  contentClassName?: string;
  imageClassName?: string;
  priority?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      data-band=""
      data-surface="photo"
      className={cn("relative isolate m-3 overflow-hidden rounded-[28px] bg-foreground text-[var(--on-photo)]", SIZE[size], className)}
    >
      {image ? (
        <Image src={image} alt={alt} fill priority={priority} sizes="100vw" className={cn("-z-10 object-cover", imageClassName)} />
      ) : null}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--foreground)_55%,transparent)_0%,color-mix(in_srgb,var(--foreground)_8%,transparent)_30%,color-mix(in_srgb,var(--foreground)_25%,transparent)_60%,color-mix(in_srgb,var(--foreground)_86%,transparent)_100%)] contrast:bg-foreground/80"
      />
      <div className={cn("relative h-full", contentClassName)}>{children}</div>
      {credit ? (
        <Glass tone="dark" className="absolute right-4 bottom-4 z-10 max-w-[60%] truncate rounded-full px-3 py-1.5 text-xs font-bold">
          {credit}
        </Glass>
      ) : null}
    </section>
  );
}
