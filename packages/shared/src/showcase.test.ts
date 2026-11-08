import { describe, expect, it } from "vitest";
import { isShowcaseWork, WorkPhotoSchema } from "./works";

const photo = WorkPhotoSchema.parse({
  id: "photo", path: "photo.webp", thumb: null, alt: { tr: "Fotoğraf" }, credit: null,
  kind: "photo", width: null, height: null,
});
const empty = { photos: [], summary: null, history: null, architecture: null };

describe("isShowcaseWork", () => {
  it("requires both a cover and nonblank Turkish text", () => {
    expect(isShowcaseWork(empty)).toBe(false);
    expect(isShowcaseWork({ ...empty, photos: [photo] })).toBe(false);
    expect(isShowcaseWork({ ...empty, summary: { tr: "Metin" } })).toBe(false);
    expect(isShowcaseWork({ ...empty, photos: [photo], summary: { tr: "Metin" } })).toBe(true);
    expect(isShowcaseWork({ ...empty, photos: [photo], history: { tr: "Tarihçe" } })).toBe(true);
    expect(isShowcaseWork({ ...empty, photos: [photo], architecture: { tr: "Mimari" } })).toBe(true);
    expect(isShowcaseWork({ ...empty, photos: [photo], summary: { tr: "" }, history: { tr: " \n " } })).toBe(false);
    expect(isShowcaseWork({ ...empty, photos: [photo], summary: { tr: " ", en: "Text" } })).toBe(false);
  });
});
