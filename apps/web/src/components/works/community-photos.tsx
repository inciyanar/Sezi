"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { FormError } from "@/components/account/form-error";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { RichTitle } from "@/components/ui/rich-title";
import { useAccount } from "@/lib/account";
import { href } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { getWorkCommunityPhotos, photoUrls, socialErrorKey } from "@/lib/social";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";

export function PhotoImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const { t } = useT();
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src)
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex aspect-square items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {t("photos.imageUnavailable")}
      </div>
    );
  // İmzalı özel kova adresleri Next görsel önbelleğine alınmaz.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("aspect-square w-full object-cover", className)}
      onError={() => setFailed(src)}
    />
  );
}

export function CommunityPhotos({ slug, className }: { slug: string; className?: string }) {
  const { t, lang } = useT();
  const { user } = useAccount();
  const headingId = useId();
  const result = useAsync(async () => {
    const { photos, count } = await getWorkCommunityPhotos(slug);
    const urls = await photoUrls(
      photos.flatMap((photo) => [photo.thumb_path, photo.path]),
    );
    return { photos, urls, count };
  }, [slug, user?.id]);
  const data = result.data;
  if (result.loading) return null;
  const shareHref = href(lang, `/hesap/fotograflar/yeni?eser=${encodeURIComponent(slug)}`);
  if (result.error) return <FormError text={t(socialErrorKey(result.error))} />;
  if (!data?.photos.length) return (
    <section aria-label={t("works.detail.communityTitle")} className={cn("flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-card p-6", className)}>
      <p>{t("works.detail.communityEmpty")}</p>
      <Button asChild variant="line"><Link href={shareHref}>{t("photos.add")}</Link></Button>
    </section>
  );
  return (
    <section aria-labelledby={headingId} className={cn("grid gap-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-3">
          <Eyebrow lang={lang} text={t("works.detail.communityCount", { n: data.count })} />
          <RichTitle as="h2" id={headingId} text={t("works.detail.communityTitle")} className="font-heading text-4xl font-normal" />
        </div>
        <Button asChild variant="line"><Link href={shareHref}>{t("photos.add")}</Link></Button>
      </div>
      <div className={cn("grid grid-cols-3 gap-3", data.photos.length >= 6 && "auto-rows-[minmax(110px,18vw)]")}>
        {data.photos.map((photo, index) => (
          <figure key={photo.id} className={cn("min-w-0", data.photos.length >= 6 && index === 0 && "row-span-2", data.photos.length >= 6 && (index === 1 || index === 4) && "col-span-2")}>
            <a href={data.urls[photo.path]} target="_blank" rel="noopener noreferrer" className="block h-full min-h-12 overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-ring">
              <PhotoImage src={data.urls[photo.thumb_path]} alt={photo.alt_text} className={cn(data.photos.length >= 6 && "h-full aspect-auto")} />
            </a>
            {(photo.credit_name || photo.caption) ? <figcaption className="mt-2 text-sm text-muted-foreground">
              {photo.credit_name ? t("photos.credit", { name: photo.credit_name }) : null}
              {photo.caption ? <span className="block text-foreground">{photo.caption}</span> : null}
            </figcaption> : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
