import { z } from "zod";
import type { ImportedProduct } from "./product-import";
import { ikeaUrlSchema } from "./product-import";

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
  bodyColor: z.string(),
  appearance: z.object({
    arms: z.enum(["none", "slim", "wide", "rolled"]),
    seats: z.number(),
    back: z.enum(["single", "split", "tufted"]),
    legs: z.enum(["hidden", "wood", "metal"]),
    legHeight: z.number(), seatHeight: z.number(), armHeight: z.number(), backDepth: z.number(), softness: z.number(),
    chaise: z.enum(["none", "left", "right"]),
  }),
});
export type PhotoResult = z.infer<typeof photoResultSchema>;
export const photoInputSchema = z.object({
  images: z.array(z.string().max(12_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)).min(1).max(4),
  name: z.string().trim().max(100),
  productImages: z.array(z.string().max(12_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)).max(4).default([]),
  url: z.union([z.literal(""), ikeaUrlSchema]).default(""),
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
    type: result.type, color: /^#[0-9a-f]{6}$/i.test(result.bodyColor) ? result.bodyColor : colors[result.color],
    appearance: {
      ...result.appearance,
      seats: Math.max(1, Math.min(5, Math.round(result.appearance.seats))),
      legHeight: Math.max(0, Math.min(0.3, result.appearance.legHeight)),
      seatHeight: Math.max(0.25, Math.min(0.65, result.appearance.seatHeight)),
      armHeight: Math.max(0.35, Math.min(0.85, result.appearance.armHeight)),
      backDepth: Math.max(0.08, Math.min(0.35, result.appearance.backDepth)),
      softness: Math.max(0.01, Math.min(0.15, result.appearance.softness)),
    },
    w: read("width"), d: read("depth"), h: read("height"),
    sourceUrl: "", missingDimensions,
    dimensionSource: ["width", "depth", "height"].map((key) => {
      const dimension = result[key as "width" | "depth" | "height"];
      return `${key}: ${dimension.evidence || "Not readable"}`;
    }).join("\n") + (result.notes ? `\n${result.notes.slice(0, 500)}` : ""),
  };
}