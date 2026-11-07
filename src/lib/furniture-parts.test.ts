import { describe, expect, it } from "vitest";
import { validateAssembly, type FurniturePart } from "./furniture-parts";

const part: FurniturePart = { label: "leg", shape: "beam", position: { x: 0, y: 0, z: 0 }, size: { x: 0.04, y: 0.01, z: 0.04 }, rotation: { x: 0, y: 0, z: 0 }, start: { x: 0.3, y: 0.02, z: 0.4 }, end: { x: 0.3, y: 0.95, z: 0.2 }, color: "#333333", material: "metal" };
describe("photo-described parts", () => {
  it("preserves angled endpoints rather than turning supports into panels", () => {
    expect(validateAssembly({ supported: true, limitations: "", parts: [part] }).parts[0]).toEqual(part);
  });
  it("rejects degenerate beams instead of substituting a generic model", () => {
    expect(validateAssembly({ supported: true, limitations: "", parts: [{ ...part, end: part.start }] })).toMatchObject({ supported: false, parts: [] });
  });
  it("rejects nonfinite geometry", () => {
    expect(validateAssembly({ supported: true, limitations: "", parts: [{ ...part, size: { x: NaN, y: 1, z: 1 } }] }).supported).toBe(false);
  });
});