import { describe, expect, it } from "vitest";
import { applyManualDimensions } from "./manual-dimensions";
import type { ImportedProduct } from "./product-import";

const product: ImportedProduct = { label: "Desk", type: "desk", color: "#343432", w: 1.6, d: 0.8, h: 0.76, missingDimensions: [], sourceUrl: "", dimensionSource: "Diagram" };
describe("manual overall dimensions", () => {
  it("overrides diagram dimensions while preserving unedited axes", () => {
    expect(applyManualDimensions(product, { h: 0.78 })).toMatchObject({ w: 1.6, d: 0.8, h: 0.78, missingDimensions: [] });
  });
  it("fills all dimensions without a diagram", () => {
    expect(applyManualDimensions({ ...product, w: 0, d: 0, h: 0 }, { w: 1.6, d: 0.8, h: 0.78 })).toMatchObject({ w: 1.6, d: 0.8, h: 0.78, missingDimensions: [] });
  });
  it("marks cleared or invalid dimensions as missing", () => {
    expect(applyManualDimensions(product, { w: 0, d: NaN, h: 16 }).missingDimensions).toEqual(["width", "depth", "height"]);
  });
});