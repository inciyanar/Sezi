/**
 * Vurgulu başlık sözdizimi: metin dosyalarında italik vurgu `_…_` ile işaretlenir (metinde en çok bir vurgu).
 * Web ve mobil `RichTitle` bileşenleri bunu böler; ekran okuyucuya ve sayfa başlığına `plainTitle` gider.
 */

/** `"Yol senin. _Ritim de._"` → `["Yol senin. ", "Ritim de.", ""]`. Vurgu yoksa yalnız ilk parça dolu. */
export function splitAccent(text: string): [string, string, string] {
  const start = text.indexOf("_");
  const end = start < 0 ? -1 : text.indexOf("_", start + 1);
  if (end < 0) return [text, "", ""];
  return [text.slice(0, start), text.slice(start + 1, end), text.slice(end + 1)];
}

/** Vurgu işaretleri çıkarılmış düz metin. */
export function plainTitle(text: string): string {
  return splitAccent(text).join("");
}
