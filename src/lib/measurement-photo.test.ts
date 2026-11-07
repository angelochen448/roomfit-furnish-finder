import { describe, expect, it } from "vitest";
import { productFromPhoto, type PhotoResult } from "./measurement-photo";

const sample: PhotoResult = {
  label: "Orange chair-bed", type: "armchair", color: "orange", notes: "",
  width: { value: 80, unit: "cm", kind: "overall", evidence: "Overall width 80 cm" },
  depth: { value: 90, unit: "cm", kind: "overall", evidence: "Overall depth 90 cm" },
  height: { value: 75, unit: "cm", kind: "overall", evidence: "Overall height 75 cm" },
};
describe("measurement photos", () => {
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