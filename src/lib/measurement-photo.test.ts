import { describe, expect, it } from "vitest";
import { productFromPhoto, type PhotoResult } from "./measurement-photo";

const sample: PhotoResult = {
  label: "Orange chair-bed", type: "armchair", color: "orange", notes: "",
  bodyColor: "#ed702b",
  appearance: { arms: "none", seats: 1, back: "single", legs: "hidden", legHeight: 0.02, seatHeight: 0.55, armHeight: 0.6, backDepth: 0.18, softness: 0.08, chaise: "none" },
  width: { value: 80, unit: "cm", kind: "overall", evidence: "Overall width 80 cm" },
  depth: { value: 90, unit: "cm", kind: "overall", evidence: "Overall depth 90 cm" },
  height: { value: 75, unit: "cm", kind: "overall", evidence: "Overall height 75 cm" },
};
describe("measurement photos", () => {
  it.each(["sofa", "bed", "desk", "chair", "table", "stool"] as const)("preserves %s classification and confirmed dimensions", type => {
    expect(productFromPhoto({ ...sample, type })).toMatchObject({ type, w: 0.8, d: 0.9, h: 0.75 });
  });
  it("preserves table shape and chair traits without accepting seat-only measurements", () => {
    const product = productFromPhoto({ ...sample, type: "stool", depth: { ...sample.depth, kind: "seat" }, structure: { supports: "sled", topShape: "oval", seatShape: "round", backStyle: "none", footrest: true, legStyle: "splayed", seatLevel: 2, mattressHeight: 2, drawers: 20, thickness: 0.05, legThickness: 0.03, panels: 2, openBack: false, material: "wood" } });
    expect(product).toMatchObject({ d: 0, missingDimensions: ["depth"], structure: { seatShape: "round", topShape: "oval", seatLevel: 0.95, mattressHeight: 0.35, drawers: 4, footrest: true } });
  });
  it("clamps new component fractions without overriding diagram dimensions", () => {
    expect(productFromPhoto({ ...sample, appearance: { ...sample.appearance, cushionHeight: 2, backHeight: -1, legThickness: 2, silhouette: "boxy", armProfile: "rectangular", upholstery: "woven" } })).toMatchObject({ w: 0.8, d: 0.9, h: 0.75, appearance: { cushionHeight: 0.24, backHeight: 0.3, legThickness: 0.08, silhouette: "boxy", armProfile: "rectangular", upholstery: "woven" } });
  });
  it("carries bounded structural traits without deriving measurements from them", () => {
    expect(productFromPhoto({ ...sample, type: "cabinet", structure: { supports: "panels", thickness: 9, legThickness: 0, panels: 20, material: "wood", openBack: false } })).toMatchObject({ w: 0.8, d: 0.9, h: 0.75, structure: { thickness: 0.2, legThickness: 0.015, panels: 8 } });
  });
  it("preserves silhouette details without using them as measured dimensions", () => {
    const appearance = { ...sample.appearance, armWidth: 0.06, backCushions: 2, backSlope: 0.1, regularDepth: 0.55, legShape: "sled" as const, seatCushion: "bench" as const };
    expect(productFromPhoto({ ...sample, appearance })).toMatchObject({ appearance, w: 0.8, d: 0.9, h: 0.75 });
  });
  it("clamps optional visual proportions independently of confirmed dimensions", () => {
    expect(productFromPhoto({ ...sample, appearance: { ...sample.appearance, armWidth: 9, backCushions: 20, backSlope: -1, regularDepth: 0 } })).toMatchObject({ appearance: { armWidth: 0.2, backCushions: 5, backSlope: 0, regularDepth: 0.35 }, w: 0.8, d: 0.9, h: 0.75 });
  });
  it("preserves the photographed armless silhouette and upholstery without changing overall dimensions", () => {
    expect(productFromPhoto(sample)).toMatchObject({ color: "#ed702b", appearance: { arms: "none", seats: 1, legs: "hidden" }, w: 0.8, d: 0.9, h: 0.75 });
  });
  it("converts explicit diagram dimensions into the placement footprint", () => {
    expect(productFromPhoto(sample)).toMatchObject({ w: 0.8, d: 0.9, h: 0.75, missingDimensions: [] });
  });
  it.each(["seat", "bed", "package", "unknown"] as const)("never substitutes %s dimensions for overall depth", (kind) => {
    expect(productFromPhoto({ ...sample, depth: { ...sample.depth, kind } })).toMatchObject({ d: 0, missingDimensions: ["depth"] });
  });
  it("leaves unreadable measurements blank", () => {
    expect(productFromPhoto({ ...sample, depth: { value: null, unit: null, kind: "unknown", evidence: "Unclear" } })).toMatchObject({ d: 0, missingDimensions: ["depth"] });
  });
  it("requires printed evidence for accepted dimensions", () => {
    expect(productFromPhoto({ ...sample, width: { ...sample.width, evidence: "" } }).w).toBe(0);
  });
});