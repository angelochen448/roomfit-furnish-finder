import { z } from "zod";
import type { ImportedProduct } from "./product-import";

const measurement = z.object({
  value: z.number().nullable(),
  unit: z.enum(["cm", "mm", "m", "in"]).nullable(),
  kind: z.enum(["overall", "seat", "bed", "package", "unknown"]),
  evidence: z.string(),
});
export const photoResultSchema = z.object({
  label: z.string(),
  type: z.enum(["sofa", "armchair", "coffeeTable", "bed", "desk", "lamp", "rug", "shelf", "cabinet"]),
  color: z.enum(["orange", "white", "black", "wood", "green", "gray"]),
  width: measurement,
  depth: measurement,
  height: measurement,
  notes: z.string(),
});
export type PhotoResult = z.infer<typeof photoResultSchema>;
export const photoInputSchema = z.object({
  images: z.array(z.string().max(12_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)).min(1).max(4),
  name: z.string().trim().max(100),
});

export function productFromPhoto(result: PhotoResult): ImportedProduct {
  const missingDimensions: string[] = [];
  const read = (key: "width" | "depth" | "height") => {
    const dimension = result[key];
    if (dimension.kind !== "overall" || dimension.value === null || !dimension.unit || !dimension.evidence.trim()) {
      missingDimensions.push(key); return 0;
    }
    const meters = dimension.value * ({ cm: 0.01, mm: 0.001, m: 1, in: 0.0254 }[dimension.unit]);
    if (!Number.isFinite(meters) || meters <= 0 || meters > 15) { missingDimensions.push(key); return 0; }
    return Math.round(meters * 1_000_000) / 1_000_000;
  };
  const colors = { orange: "#ed702b", white: "#eeeae3", black: "#343432", wood: "#9d896f", green: "#7a8b6f", gray: "#91918c" };
  return {
    label: result.label.trim().slice(0, 100) || "Furniture from photo",
    type: result.type, color: colors[result.color],
    w: read("width"), d: read("depth"), h: read("height"),
    sourceUrl: "", missingDimensions,
    dimensionSource: ["width", "depth", "height"].map((key) => {
      const dimension = result[key as "width" | "depth" | "height"];
      return `${key}: ${dimension.evidence || "Not readable"}`;
    }).join("\n") + (result.notes ? `\n${result.notes.slice(0, 500)}` : ""),
  };
}