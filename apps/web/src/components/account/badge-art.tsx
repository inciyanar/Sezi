import type { BadgeId } from "@sezi/shared";

import { cn } from "@/lib/utils";

/** Mobil ile aynı şeffaf PNG damga seti. */
export function badgeSrc(id: BadgeId): string {
  return `/badges/${id}.png`;
}

/**
 * Damga çizimi (15 damga, tasarımdaki sırayla). Kilitliyken soluk; durum çevresindeki metinle de söylenir,
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
      className={cn("shrink-0 object-contain", locked && "opacity-35", className)}
    />
  );
}
