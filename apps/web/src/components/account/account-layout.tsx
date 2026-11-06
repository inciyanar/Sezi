import type { ReactNode } from "react";

import { PageContainer } from "@/components/page";
import { Eyebrow } from "@/components/ui/eyebrow";
import { RichTitle } from "@/components/ui/rich-title";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Hesap sayfalarının başlığı: marka renginde üst etiket, `_…_` vurgulu Fraunces başlık ve isteğe bağlı giriş metni.
 * `action` başlığın sağına (dar ekranda altına) oturur.
 */
export function AccountHeader({
  title,
  eyebrow,
  lead,
  lang,
  action,
  className,
}: {
  title: string;
  eyebrow?: string;
  lead?: ReactNode;
  lang: Lang;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:mb-10", className)}>
      <div className="grid max-w-2xl gap-4">
        {eyebrow ? <Eyebrow text={eyebrow} lang={lang} className="text-link" /> : null}
        <RichTitle as="h1" text={title} className="text-[clamp(2.25rem,4.4vw,3.5rem)] font-light" />
        {lead ? <p className="text-lg text-muted-foreground">{lead}</p> : null}
      </div>
      {action}
    </header>
  );
}

/** Hesap sayfa kabı: dar formlar `narrow`, pano ve listeler `wide`. */
export function AccountPage({
  width = "narrow",
  className,
  children,
}: {
  width?: "narrow" | "medium" | "wide";
  className?: string;
  children: ReactNode;
}) {
  return (
    <PageContainer className={cn(width === "narrow" ? "max-w-xl" : width === "medium" ? "max-w-3xl" : "max-w-6xl", "pb-16", className)}>
      {children}
    </PageContainer>
  );
}

/** Hesap kartı: sıcak beyaz yüzey, 24 px köşe, ince çizgi; gölgesiz. */
export const accountCard = "rounded-[24px] border bg-card";
