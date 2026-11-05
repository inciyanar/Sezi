import type { ElementType } from "react";

import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Üst etiket: küçük, kalın, aralıklı büyük harf. Büyük harf dilin kuralıyla yazılır (Türkçe i → İ);
 * CSS `uppercase` Türkçede yanlış harf verdiği için kullanılmaz.
 */
export function Eyebrow({ text, lang, className, as: Tag = "p" }: { text: string; lang: Lang; className?: string; as?: ElementType }) {
  return <Tag className={cn("text-[13px] leading-snug font-bold tracking-[0.16em]", className)}>{text.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-GB")}</Tag>;
}
