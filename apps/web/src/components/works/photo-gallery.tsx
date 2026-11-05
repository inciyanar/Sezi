"use client";

import { loc, type WorkPhoto } from "@sezi/shared";
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, LandmarkIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lens } from "@/components/works/lens";
import { photoCreditLine } from "@/components/works/photo-source";
import { useT } from "@/lib/i18n-client";
import { photoUrl } from "@/lib/media";
import { toneClass } from "@/lib/tone";
import { cn } from "@/lib/utils";

/**
 * Eser kapağı (yer kartı düzeni): tam genişlik kapak fotoğrafı; atıf ve fotoğraf sayısı fotoğrafın üstünde, aşağıdaki
 * kartın bindiği şeridin üstünde. Fotoğrafa dokununca hepsi büyük pencerede gezilir. Fotoğraf yoksa tür tonunda glif.
 */
export function PhotoGallery({
  photos,
  workName,
  typeSlug,
}: {
  photos: WorkPhoto[];
  workName: string;
  typeSlug: string;
}) {
  const { t, lang } = useT();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div
        aria-hidden
        className={cn("grid h-full min-h-80 w-full place-items-center overflow-hidden", toneClass(typeSlug))}
      >
        <LandmarkIcon className="size-24" strokeWidth={1.5} />
      </div>
    );
  }

  const currentPhoto = photos[0];
  if (!currentPhoto) return null;
  const currentAlt = loc(currentPhoto.alt, lang) || workName;

  const activePhoto = activeIndex !== null ? photos[activeIndex] : undefined;
  const activeAlt = activePhoto
    ? loc(activePhoto.alt, lang) || workName
    : workName;

  const currentCreditLine = photoCreditLine(currentPhoto, t);
  const activeCreditLine = activePhoto ? photoCreditLine(activePhoto, t) : null;

  return (
    <div role="group" aria-label={t("works.detail.photosTitle")} className="h-full">
      <figure className="relative h-full [&>div]:h-full">
        <Lens src={photoUrl(currentPhoto, "full")}>
          <div className="relative h-full min-h-80 w-full overflow-hidden bg-muted">
            <button
              type="button"
              onClick={() => setActiveIndex(0)}
              aria-label={[
                t("works.detail.openPhoto", { alt: currentAlt }),
                photos.length > 1 ? t("works.detail.photoCount", { n: photos.length }) : null,
              ]
                .filter(Boolean)
                .join(". ")}
              className="absolute inset-0 size-full text-left outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <Image
                src={photoUrl(currentPhoto, "full")}
                alt={currentAlt}
                fill
                priority
                fetchPriority="high"
                quality={50}
                sizes="(min-width: 1280px) 1152px, calc(100vw - 2rem)"
                className="object-cover"
              />
            </button>
          </div>
        </Lens>
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-end gap-3">
          {currentCreditLine ? (
            <figcaption className="pointer-events-auto inline-flex min-h-12 min-w-0 max-w-[80%] items-center gap-x-2 rounded-full bg-[var(--glass-dark)] px-4 py-1 text-sm text-[var(--glass-dark-fg)] backdrop-blur-md contrast:outline-2 contrast:outline-current">
              <span className="min-w-0 truncate">{t("works.detail.photoCreditLine", { credit: currentCreditLine })}</span>
              {currentPhoto.source_url ? (
                <a
                  href={currentPhoto.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative shrink-0 font-semibold underline before:absolute before:-inset-3 before:content-['']"
                >
                  {t("works.detail.openSourceUrl")}
                </a>
              ) : null}
            </figcaption>
          ) : (
            <span />
          )}
          {photos.length > 1 ? (
            <span aria-hidden className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-card px-3 text-sm font-semibold text-foreground contrast:outline-2 contrast:outline-border">
              <CameraIcon className="size-4" />
              <span className="num">{photos.length}</span>
            </span>
          ) : null}
        </div>
      </figure>

      <Dialog
        open={activeIndex !== null}
        onOpenChange={(open) => !open && setActiveIndex(null)}
      >
        <DialogContent
          className="sm:max-w-4xl"
          closeLabel={t("works.detail.closeDialog")}
          closeButtonClassName="min-h-12 min-w-12"
        >
          <DialogHeader>
            <DialogTitle>
              {t("works.detail.photoDialogTitle", {
                name: workName,
                index: (activeIndex ?? 0) + 1,
                total: photos.length,
              })}
            </DialogTitle>
            <DialogDescription>{activeAlt}</DialogDescription>
          </DialogHeader>
          {activePhoto ? (
            <div className="grid gap-3">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={photoUrl(activePhoto, "full")}
                  alt={activeAlt}
                  fill
                  sizes="(min-width: 1024px) 896px, 100vw"
                  className="object-contain"
                />

              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                {activeCreditLine ? (
                  <p className="text-sm text-muted-foreground">
                    {t("works.detail.photoCreditLine", { credit: activeCreditLine })}
                    {activePhoto.source_url ? (
                      <>
                        {" · "}
                        <a
                          href={activePhoto.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-12 items-center font-medium text-link underline"
                        >
                          {t("works.detail.openSourceUrl")}
                        </a>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <span />
                )}
                {photos.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-12"
                      aria-label={t("works.detail.prevPhoto")}
                      onClick={() =>
                        setActiveIndex((prev) =>
                          prev === null
                            ? 0
                            : (prev - 1 + photos.length) % photos.length,
                        )
                      }
                    >
                      <ChevronLeftIcon aria-hidden />
                      <span>{t("works.detail.prevPhoto")}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-12"
                      aria-label={t("works.detail.nextPhoto")}
                      onClick={() =>
                        setActiveIndex((prev) =>
                          prev === null ? 0 : (prev + 1) % photos.length,
                        )
                      }
                    >
                      <span>{t("works.detail.nextPhoto")}</span>
                      <ChevronRightIcon aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
