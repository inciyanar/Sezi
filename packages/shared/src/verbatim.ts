/** Kaynaktan izin verilen en uzun birebir alıntı (ardışık kelime). Telif: kitap metni yeniden yazılmadan aktarılmaz. */
export const MAX_VERBATIM_WORDS = 12;

const words = (text: string): string[] =>
  text
    .replace(/\[(?:K)?\d+\]/g, " ")
    .toLocaleLowerCase("tr")
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/**
 * Cevabın herhangi bir kaynaktan sınırı aşan uzunlukta birebir kelime dizisi taşıyıp taşımadığı.
 * Noktalama, büyük/küçük harf ve kaynak işaretleri ([1], [K2]) yok sayılır.
 */
export function copiesVerbatim(answer: string, sources: readonly string[], limit = MAX_VERBATIM_WORDS): boolean {
  const a = words(answer);
  const n = limit + 1;
  if (a.length < n) return false;
  const windows = new Set<string>();
  for (const source of sources) {
    const s = words(source);
    for (let i = 0; i + n <= s.length; i++) windows.add(s.slice(i, i + n).join(" "));
  }
  for (let i = 0; i + n <= a.length; i++) if (windows.has(a.slice(i, i + n).join(" "))) return true;
  return false;
}
