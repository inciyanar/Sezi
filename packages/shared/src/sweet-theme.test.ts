import { describe, expect, it } from "vitest";
import { colorSafeThemes, resolveSweetTheme, sweetThemes, type SweetTheme } from "./sweet-theme";
import { contrastRatio } from "./theme";

const allThemes: [string, SweetTheme][] = [...Object.entries(sweetThemes), ...Object.entries(colorSafeThemes).map(([name, t]): [string, SweetTheme] => [`colorSafe.${name}`, t])];

describe("Çini 2 kontrastı (WCAG AA ≥ 4.5)", () => {
  for (const [name, t] of allThemes) {
    it(`${name}: metin, ton, düğme ve sekme çubuğu çiftleri AA'yı geçer`, () => {
      const pairs: [string, string, string][] = [
        ["text/background", t.text, t.background],
        ["text/surface", t.text, t.surface],
        ["text/soft", t.text, t.soft],
        ["textMuted/background", t.textMuted, t.background],
        ["textMuted/soft", t.textMuted, t.soft],
        ["danger/background", t.danger, t.background],
        ["primary.ink/primary.fill", t.primary.ink, t.primary.fill],
        ["primaryText/background", t.primaryText, t.background],
        ["primaryText/surface", t.primaryText, t.surface],
        ["accent.ink/accent.fill", t.accent.ink, t.accent.fill],
        ["nav.foreground/nav.background", t.nav.foreground, t.nav.background],
        ["nav.activeLabel/nav.background", t.nav.activeLabel, t.nav.background],
        ["nav.activeForeground/nav.activeBackground", t.nav.activeForeground, t.nav.activeBackground],
        ["primaryText/soft", t.primaryText, t.soft],
        ["accentText/background", t.accentText, t.background],
        ["accentText/surface", t.accentText, t.surface],
        ["danger/surface", t.danger, t.surface],
        ["danger/soft", t.danger, t.soft],
      ];
      for (const [tone, { fill, ink }] of Object.entries(t.tones)) {
        pairs.push([`${tone}.ink/${tone}.fill`, ink, fill]);
      }
      for (const [label, fg, bg] of pairs) {
        expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(4.5);
      }
    });

    // Seçili sekme renkten bağımsız da ayrılır (dolu simge, kalın yazı); kapsül ya da simge çubuk zemininden seçilir (WCAG 1.4.11, ≥ 3).
    it(`${name}: seçili sekme çubuk zemininden ayırt edilir`, () => {
      const indicator = Math.max(contrastRatio(t.nav.activeBackground, t.nav.background), contrastRatio(t.nav.activeForeground, t.nav.background));
      expect(indicator).toBeGreaterThanOrEqual(3);
    });
  }

  // Web ve admin eylem rengi: açık temada koyu firuze dolgu (`tones.teal.ink`) üstünde yüzey rengi yazı (apps/web/src/lib/theme.ts).
  it("web eylem dolgusu (tones.teal.ink) üstünde yüzey rengi yazı AA'yı geçer", () => {
    const t = sweetThemes.light;
    expect(contrastRatio(t.surface, t.tones.teal.ink)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.tones.teal.ink, t.background)).toBeGreaterThanOrEqual(3);
  });

  it("yüksek kontrast çerçeveli çizilir ve AAA (≥ 7) metin sağlar", () => {
    const t = sweetThemes.highContrast;
    expect(t.outlined).toBe(true);
    expect(contrastRatio(t.text, t.background)).toBeGreaterThanOrEqual(7);
  });
});

// Machado vd. (2009) tam şiddet benzetim matrisleri, doğrusal sRGB üzerinde.
const CVD: Record<string, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

function linear(hex: string): number[] {
  return [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}

function lab(rgb: number[]): number[] {
  const [r = 0, g = 0, b = 0] = rgb.map((v) => Math.min(1, Math.max(0, v)));
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function simulatedDistance(a: string, b: string, matrix: number[][]): number {
  const apply = (v: number[]) => matrix.map((row) => row.reduce((sum, m, i) => sum + m * (v[i] ?? 0), 0));
  const la = lab(apply(linear(a)));
  const lb = lab(apply(linear(b)));
  return Math.hypot(...la.map((v, i) => v - (lb[i] ?? 0)));
}

describe("renk körlüğüne uygun tonlar", () => {
  for (const [mode, t] of Object.entries(colorSafeThemes)) {
    // ΔE ≥ 10: yan yana iki tür kutucuğu her üç körlük türünde de ayrı renk olarak görünür.
    it(`${mode}: her ton çifti protan, deutan ve tritan benzetiminde ayrışır`, () => {
      const fills = Object.entries(t.tones);
      for (const [kind, matrix] of Object.entries(CVD)) {
        fills.forEach(([na, a], i) => {
          for (const [nb, b] of fills.slice(i + 1)) {
            expect(simulatedDistance(a.fill, b.fill, matrix), `${kind} ${na}/${nb}`).toBeGreaterThanOrEqual(10);
          }
        });
      }
    });
  }

  it("yüksek kontrast renk körlüğü seçeneğinin önüne geçer", () => {
    expect(resolveSweetTheme("dark", { highContrast: true, colorSafe: true })).toBe(sweetThemes.highContrast);
    expect(resolveSweetTheme("dark", { highContrast: false, colorSafe: true })).toBe(colorSafeThemes.dark);
  });
});
