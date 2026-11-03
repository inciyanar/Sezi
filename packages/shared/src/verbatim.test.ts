import { describe, expect, it } from "vitest";

import { copiesVerbatim } from "./verbatim";

const source =
  "Cami, Yıldırım Bayezid tarafından Niğbolu zaferinin ardından yaptırılmış olup yirmi kubbeli planıyla Osmanlı mimarisinin ulu cami tipinin en gösterişli örneğidir.";

describe("birebir alıntı sınırı", () => {
  it("12 kelimelik ortak dizi serbest, 13 kelime sınırı aşar", () => {
    const twelve = "Yıldırım Bayezid tarafından Niğbolu zaferinin ardından yaptırılmış olup yirmi kubbeli planıyla Osmanlı";
    const thirteen = `${twelve} mimarisinin`;
    expect(copiesVerbatim(`Bilgi: ${twelve} [1].`, [source])).toBe(false);
    expect(copiesVerbatim(`Bilgi: ${thirteen} [1].`, [source])).toBe(true);
  });

  it("büyük harf, noktalama ve kaynak işaretleri kopyayı gizlemez", () => {
    const copied =
      "YILDIRIM Bayezid tarafından, Niğbolu zaferinin [K1] ardından yaptırılmış olup; yirmi kubbeli planıyla Osmanlı mimarisinin ulu";
    expect(copiesVerbatim(copied, [source])).toBe(true);
  });

  it("yeniden yazılmış cevap ve başka kaynaktaki dizi sınırı aşmaz", () => {
    expect(copiesVerbatim("Camiyi Yıldırım Bayezid, Niğbolu zaferinden sonra yaptırmış; yirmi kubbesi var [1].", [source])).toBe(false);
    expect(copiesVerbatim(source, ["Bambaşka bir kaynak metni burada duruyor."])).toBe(false);
  });
});
