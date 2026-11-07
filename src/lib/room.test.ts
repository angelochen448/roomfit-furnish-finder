import { describe, it, expect } from "vitest";
import { fitsInRoom, overlaps, footprint, type PlacedItem } from "./room";

const room = { width: 4, depth: 3, height: 2.5 };
const sofa = (p: Partial<PlacedItem> = {}): PlacedItem => ({
  id: "a", type: "sofa", label: "Sofa", x: 0, z: 0, rot: 0, w: 2, d: 1, h: 0.8, color: "#000", ...p,
});

describe("room rules", () => {
  it("rotating 90° swaps footprint", () => {
    expect(footprint({ w: 2, d: 1, rot: 90 })).toEqual({ w: 1, d: 2 });
  });
  it("item touching the wall fits, past it does not", () => {
    expect(fitsInRoom(sofa({ x: 1 }), room)).toBe(true);
    expect(fitsInRoom(sofa({ x: 1.1 }), room)).toBe(false);
  });
  it("rotated sofa too deep for room fails", () => {
    expect(fitsInRoom(sofa({ w: 3.2, rot: 90 }), room)).toBe(false);
  });
  it("overlapping items are flagged; rugs never overlap", () => {
    expect(overlaps(sofa(), sofa({ id: "b", x: 1.5 }))).toBe(true);
    expect(overlaps(sofa(), sofa({ id: "b", x: 2 }))).toBe(false);
    expect(overlaps(sofa(), sofa({ id: "b", type: "rug" }))).toBe(false);
  });
});
