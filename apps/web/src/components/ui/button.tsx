"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { ArrowRightIcon } from "lucide-react"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  // Sezi: hap düğme, yazı Atkinson kalın (mobil düğmelerle aynı). Görsel yükseklik 32–56 px; dokunma alanı ::after ile en az 48×48 (AGENTS kural 5).
  // Hover'da 2 px yükselir (yalnız fareli cihazda), basınca 0.97'ye küçülür; hareket azaltmada geçiş anlıktır (globals.css).
  "group/button relative after:absolute after:inset-x-[min(0px,calc((100%_-_48px)/2))] after:inset-y-[min(0px,calc((100%_-_48px)/2))] after:content-[''] inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding font-bold text-sm whitespace-nowrap transition-[transform,background-color,color,box-shadow] duration-160 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [@media(hover:hover)]:hover:-translate-y-0.5 active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        /** Fotoğraf ya da koyu bant üstünde: krem dolgu, mürekkep yazı. */
        cream: "bg-on-photo text-foreground hover:bg-on-photo/90 contrast:bg-background contrast:outline-2 contrast:outline-foreground",
        /** Saydam, yazı renginde 1.5 px çerçeve (bulunduğu yüzeyin yazı rengini alır). */
        line: "border-[1.5px] border-current bg-transparent hover:bg-current/10",
        outline:
          "border-input bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-12 gap-2 px-5 text-[0.9375rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-8 gap-1.5 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 gap-1.5 px-4 text-[0.875rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-14 gap-2.5 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-12",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-10",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** Düğme yazısının sağındaki altın ok dairesi (dekoratif). */
function ArrowDot() {
  return (
    <span aria-hidden className="-mr-2.5 grid size-[30px] shrink-0 place-items-center rounded-full bg-gold text-gold-foreground">
      <ArrowRightIcon className="size-3.5" strokeWidth={2.4} />
    </span>
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  arrow = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Sağda altın daire içinde ok (ana eylem: "Rotamı oluştur", "Yürüyüşe başla"). */
    arrow?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }), arrow && "gap-3")}
      {...props}
    >
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
      {arrow ? <ArrowDot /> : null}
    </Comp>
  )
}

export { Button, buttonVariants }
