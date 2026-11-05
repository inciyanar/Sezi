import { splitAccent } from "@sezi/shared";
import type { ElementType } from "react";

import { cn } from "@/lib/utils";

/**
 * Vurgulu başlık: metindeki `_…_` parçası italik Fraunces ve vurgu rengiyle yazılır (metinde en çok bir vurgu).
 * Vurgu rengi `--title-accent`: düz zeminde bağlantı kahvesi, `data-surface="photo"` kapsayıcıda altın.
 */
export function RichTitle({ text, className, as: Tag = "h2", id }: { text: string; className?: string; as?: ElementType; id?: string }) {
  const [before, accent, after] = splitAccent(text);
  return (
    <Tag id={id} className={cn("font-heading font-normal tracking-[-0.03em] leading-[1.02]", className)}>
      {before}
      {accent ? <em className="font-heading italic text-[var(--title-accent)]">{accent}</em> : null}
      {after}
    </Tag>
  );
}
