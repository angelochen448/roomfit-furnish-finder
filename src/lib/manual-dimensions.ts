import type { ImportedProduct } from "./product-import";

export function applyManualDimensions(product: ImportedProduct, dimensions: Partial<Pick<ImportedProduct, "w" | "d" | "h">>): ImportedProduct {
  const next = { ...product, ...dimensions };
  next.missingDimensions = (["w", "d", "h"] as const)
    .filter(key => !Number.isFinite(next[key]) || next[key] <= 0 || next[key] > 15)
    .map(key => ({ w: "width", d: "depth", h: "height" }[key]));
  return next;
}