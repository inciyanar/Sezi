import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

const TONE = {
  light: "bg-[var(--glass-light)] text-[var(--glass-light-fg)] [--muted-foreground:var(--glass-light-muted)]",
  dark: "bg-[var(--glass-dark)] text-[var(--glass-dark-fg)] [--muted-foreground:var(--glass-dark-muted)] [--grain-opacity:0.35]",
} as const;

type GlassProps<T extends ElementType> = {
  tone: keyof typeof TONE;
  /** Kâğıt dokusu (geniş cam panellerde). */
  grain?: boolean;
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * Buzlu cam yüzeyi: arkadaki fotoğrafı bulanıklaştırır, üstüne tema cam tonu serer (`--glass-*`, sweet-theme `glass`).
 * Saydamlık en kötü fotoğrafta da yazıyı AA'da tutar. Koyu cam fotoğraf yüzeyi sayılır (vurgu altın).
 * Yüksek kontrastta bulanıklık ve doku kalkar, yüzey opak olur ve 2 px çerçeve alır.
 */
export function Glass<T extends ElementType = "div">({ tone, grain = false, as, className, children, ...props }: GlassProps<T>) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      data-surface={tone === "dark" ? "photo" : undefined}
      className={cn(
        "relative backdrop-blur-[26px] backdrop-saturate-[.85] contrast:backdrop-filter-none contrast:outline-2 contrast:-outline-offset-2 contrast:outline-current",
        TONE[tone],
        grain && "grain",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
