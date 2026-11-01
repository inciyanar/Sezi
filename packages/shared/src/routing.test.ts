import { describe, expect, it } from "vitest";
import {
  NavSegment,
  buildGuidance,
  findRoute,
  pointAlong,
  stereoPan,
  type Instruction,
  type NavNode,
  type UserProfile,
} from "./index";

const base: UserProfile = {
  vision: "full",
  mobility: "none",
  hearing: "full",
  senses: { audio: true, haptic: true, visual: true },
  lang: "tr",
};
const wheelchair: UserProfile = { ...base, mobility: "wheelchair" };
const blind: UserProfile = { ...base, vision: "blind", senses: { audio: true, haptic: true, visual: false } };

// A → B → D kısa ama merdivenli; A → C → D uzun ama rampalı.
const nodes = new Map<string, NavNode>(
  (
    [
      { id: "A", lynchType: "node", location: [28.9640, 41.0160] },
      { id: "B", lynchType: "node", location: [28.9645, 41.0160] },
      { id: "C", lynchType: "landmark", name: { tr: "Sebil", en: "Fountain" }, location: [28.9640, 41.0166] },
      { id: "D", lynchType: "landmark", name: { tr: "Medrese" }, location: [28.9650, 41.0166] },
    ] satisfies NavNode[]
  ).map((n) => [n.id, n]),
);
const segments = [
  { id: "AB", from: "A", to: "B", lengthM: 40 },
  { id: "BD", from: "B", to: "D", lengthM: 70, steps: 12 },
  { id: "AC", from: "A", to: "C", lengthM: 70 },
  { id: "CD", from: "C", to: "D", lengthM: 80, slopePct: 5 },
].map((s) => NavSegment.parse(s));

const scenicSegments = [
  { id: "AD", from: "A", to: "D", lengthM: 100 },
  { id: "AC", from: "A", to: "C", lengthM: 60, landmarkVisibility: 1 },
  { id: "CD", from: "C", to: "D", lengthM: 60, landmarkVisibility: 1 },
].map((s) => NavSegment.parse(s));

describe("findRoute", () => {
  it("varsayılan profil kısa merdivenli yolu seçer", () => {
    expect(findRoute(segments, base, "A", "D")?.nodeIds).toEqual(["A", "B", "D"]);
  });

  it("tekerlekli sandalye merdivenden kaçınır", () => {
    const r = findRoute(segments, wheelchair, "A", "D");
    expect(r?.nodeIds).toEqual(["A", "C", "D"]);
    expect(r?.lengthM).toBe(150);
  });

  it("onaylı bildirimle kapanan segment rotadan çıkar", () => {
    const closed = segments.map((s) => (s.id === "CD" ? { ...s, blocked: true } : s));
    expect(findRoute(closed, wheelchair, "A", "D")).toBeNull();
  });

  it("gürültülü segment görme engelli için pahalılaşır", () => {
    const noisy = segments.map((s) =>
      s.id === "AB" || s.id === "BD" ? { ...s, noise: 1 } : s,
    );
    expect(findRoute(noisy, blind, "A", "D")?.nodeIds).toEqual(["A", "C", "D"]);
  });

  it("shortest mesafeyi en aza indirir, profil maliyeti görünür rotayı seçmeye devam eder", () => {
    expect(findRoute(scenicSegments, base, "A", "D")?.nodeIds).toEqual(["A", "C", "D"]);
    const shortest = findRoute(scenicSegments, base, "A", "D", "shortest");
    expect(shortest?.nodeIds).toEqual(["A", "D"]);
    expect(shortest?.lengthM).toBe(100);
  });

  it.each([
    ["blocked", { blocked: true }],
    ["steps", { steps: 1 }],
    ["kerb", { kerb: true }],
    ["slope", { slopePct: 9 }],
    ["width", { widthCm: 80 }],
  ])("shortest tekerlekli sandalye için %s segmentini dışarıda bırakır", (_constraint, exclusion) => {
    const graph = [
      NavSegment.parse({ id: "AB", from: "A", to: "D", lengthM: 10, ...exclusion }),
      NavSegment.parse({ id: "AC", from: "A", to: "C", lengthM: 40 }),
      NavSegment.parse({ id: "CD", from: "C", to: "D", lengthM: 40 }),
    ];
    expect(findRoute(graph, wheelchair, "A", "D", "shortest")?.segmentIds).toEqual(["AC", "CD"]);
  });
});

describe("buildGuidance", () => {
  const route = findRoute(segments, wheelchair, "A", "D")!;

  it("onaylı ses talimatını görme engelliye tercih eder", () => {
    const instructions: Instruction[] = [
      { id: "1", nodeId: "C", text: { tr: "Sebili görünce sağa dönün." }, cueType: "visual", status: "verified" },
      { id: "2", nodeId: "C", text: { tr: "Su sesini duyunca sağa yönelin." }, cueType: "sound", status: "verified" },
      { id: "3", nodeId: "C", text: { tr: "Taslak." }, cueType: "tactile", status: "draft" },
    ];
    const steps = buildGuidance(route, nodes, instructions, { ...blind, mobility: "wheelchair" });
    expect(steps[0]).toMatchObject({ nodeId: "C", authored: true, cueType: "sound" });
    expect(steps.at(-1)?.text).toBe("Vardınız: Medrese.");
  });

  it("talimat yoksa landmark adıyla genel yönlendirme üretir", () => {
    const steps = buildGuidance(route, nodes, [], wheelchair);
    expect(steps[0]).toMatchObject({ authored: false, turn: "right" });
    expect(steps[0]!.text).toBe("Sebil hizasında sağa dönün.");
  });
});

describe("geo", () => {
  it("sağdaki ses sağ kulağa panlanır", () => {
    expect(stereoPan(0, 90)).toBeCloseTo(1);
    expect(stereoPan(0, 270)).toBeCloseTo(-1);
  });

  it("pointAlong polyline sonunu aşmaz", () => {
    const line: [number, number][] = [[28.964, 41.016], [28.965, 41.016]];
    expect(pointAlong(line, 1e6)).toEqual(line[1]);
  });
});

describe("işitme profili", () => {
  it("duymayan kullanıcıya ses ipuçlu talimat verilmez, görsel talimat seçilir", () => {
    const route = findRoute(segments, wheelchair, "A", "D")!;
    const instructions: Instruction[] = [
      { id: "1", nodeId: "C", text: { tr: "Su sesini duyunca sağa yönelin." }, cueType: "sound", status: "verified" },
      { id: "2", nodeId: "C", text: { tr: "Sebili görünce sağa dönün." }, cueType: "visual", status: "verified" },
    ];
    const deaf: UserProfile = { ...wheelchair, hearing: "deaf" };
    expect(buildGuidance(route, nodes, instructions, deaf)[0]).toMatchObject({ cueType: "visual", authored: true });
  });

  it("yalnızca ses ipucu varsa duymayan kullanıcı genel yönlendirme alır", () => {
    const route = findRoute(segments, wheelchair, "A", "D")!;
    const only: Instruction[] = [{ id: "1", nodeId: "C", text: { tr: "Su sesini duyunca sağa yönelin." }, cueType: "sound", status: "verified" }];
    expect(buildGuidance(route, nodes, only, { ...wheelchair, hearing: "deaf" })[0]).toMatchObject({ authored: false });
  });
});
