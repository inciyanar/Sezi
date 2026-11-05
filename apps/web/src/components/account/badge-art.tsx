import type { BadgeId } from "@sezi/shared";

import { cn } from "@/lib/utils";

/** Damga çizimi dosyası (`public/badges`); Kuzey Rüzgârı fotoğraf dokulu olduğu için webp. */
export function badgeSrc(id: BadgeId): string {
  return `/badges/${id}.${id === "08-kuzey-ruzgari" ? "webp" : "svg"}`;
}

/**
 * Damga çizimi (14 damga, tasarımdaki sırayla). Kilitliyken gri ve soluk; durum çevresindeki metinle de söylenir,
 * yalnız renkle değil. Dekoratiftir: adı yanındaki yazı ya da düğmenin erişilebilir adı verir.
 */
export function BadgeArt({ id, size, locked = false, className }: { id: BadgeId; size: number; locked?: boolean; className?: string }) {
  return (
    <img
      src={badgeSrc(id)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-full object-cover", locked && "opacity-50 brightness-[1.15] contrast-[.75] grayscale", className)}
    />
  );
}
