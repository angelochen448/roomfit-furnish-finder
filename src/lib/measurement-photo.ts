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
  type: z.enum(["sofa", "armchair", "chair", "stool", "table", "coffeeTable", "bed", "desk", "lamp", "rug", "shelf", "cabinet"]),
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
    armWidth: z.number().optional(),
    backCushions: z.number().optional(),
    backSlope: z.number().optional(),
    seatCushion: z.enum(["bench", "split"]).optional(),
    legShape: z.enum(["block", "tapered", "splayed", "sled"]).optional(),
    regularDepth: z.number().optional(),
    silhouette: z.enum(["boxy", "rounded", "plush"]).optional(),
    armProfile: z.enum(["rectangular", "rounded", "rolled", "sloped"]).optional(),
    cushionHeight: z.number().optional(),
    backHeight: z.number().optional(),
    legThickness: z.number().optional(),
    upholstery: z.enum(["woven", "velvet", "leather"]).optional(),
  }),
  structure: z.object({
    topShape: z.enum(["rectangular", "round", "oval"]).optional(),
    legStyle: z.enum(["straight", "tapered", "splayed"]).optional(),
    seatShape: z.enum(["rectangular", "round", "oval"]).optional(),
    backStyle: z.enum(["none", "solid", "slatted"]).optional(),
    seatLevel: z.number().optional(), footrest: z.boolean().optional(),
    headboard: z.enum(["none", "solid", "slatted", "upholstered"]).optional(),
    mattressHeight: z.number().optional(), drawers: z.number().optional(),
    supports: z.enum(["fourLegs", "pedestal", "panels", "trestle", "sled"]),
    thickness: z.number(), legThickness: z.number(), panels: z.number(),
    openBack: z.boolean(), material: z.enum(["wood", "metal", "glass", "painted"]),
  }).optional(),
});
export type PhotoResult = z.infer<typeof photoResultSchema>;
// Structured vision output requires every key; null means an uncertain trait.
export const photoVisionResultSchema = photoResultSchema.extend({
  appearance: photoResultSchema.shape.appearance.extend({
    armWidth: z.number().nullable(), backCushions: z.number().nullable(),
    backSlope: z.number().nullable(), regularDepth: z.number().nullable(),
    seatCushion: z.enum(["bench", "split"]).nullable(),
    legShape: z.enum(["block", "tapered", "splayed", "sled"]).nullable(),
    silhouette: z.enum(["boxy", "rounded", "plush"]).nullable(),
    armProfile: z.enum(["rectangular", "rounded", "rolled", "sloped"]).nullable(),
    cushionHeight: z.number().nullable(), backHeight: z.number().nullable(),
    legThickness: z.number().nullable(),
    upholstery: z.enum(["woven", "velvet", "leather"]).nullable(),
  }),
  structure: z.object({
    topShape: z.enum(["rectangular", "round", "oval"]).nullable(),
    legStyle: z.enum(["straight", "tapered", "splayed"]).nullable(),
    seatShape: z.enum(["rectangular", "round", "oval"]).nullable(),
    backStyle: z.enum(["none", "solid", "slatted"]).nullable(),
    seatLevel: z.number().nullable(), footrest: z.boolean().nullable(),
    headboard: z.enum(["none", "solid", "slatted", "upholstered"]).nullable(),
    mattressHeight: z.number().nullable(), drawers: z.number().nullable(),
    supports: z.enum(["fourLegs", "pedestal", "panels", "trestle", "sled"]).nullable(),
    thickness: z.number().nullable(), legThickness: z.number().nullable(), panels: z.number().nullable(),
    openBack: z.boolean().nullable(), material: z.enum(["wood", "metal", "glass", "painted"]).nullable(),
  }).nullable(),
});
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
  const { armWidth, backCushions, backSlope, regularDepth, seatCushion, legShape, cushionHeight, backHeight, legThickness, silhouette, armProfile, upholstery, ...coreAppearance } = result.appearance;
  return {
    label: result.label.trim().slice(0, 100) || "Furniture from photo",
    type: result.type, color: /^#[0-9a-f]{6}$/i.test(result.bodyColor) ? result.bodyColor : colors[result.color],
    ...(result.structure ? { structure: {
      ...result.structure,
      ...(result.structure.seatLevel !== undefined ? { seatLevel: Math.max(0.3, Math.min(0.95, result.structure.seatLevel)) } : {}),
      ...(result.structure.mattressHeight !== undefined ? { mattressHeight: Math.max(0.08, Math.min(0.35, result.structure.mattressHeight)) } : {}),
      ...(result.structure.drawers !== undefined ? { drawers: Math.max(0, Math.min(4, Math.round(result.structure.drawers))) } : {}),
      thickness: Math.max(0.015, Math.min(0.2, result.structure.thickness)),
      legThickness: Math.max(0.015, Math.min(0.18, result.structure.legThickness)),
      panels: Math.max(1, Math.min(8, Math.round(result.structure.panels))),
    } } : {}),
    appearance: {
      ...coreAppearance,
      ...(silhouette !== undefined ? { silhouette } : {}),
      ...(armProfile !== undefined ? { armProfile } : {}),
      ...(upholstery !== undefined ? { upholstery } : {}),
      ...(seatCushion !== undefined ? { seatCushion } : {}),
      ...(legShape !== undefined ? { legShape } : {}),
      seats: Math.max(1, Math.min(5, Math.round(result.appearance.seats))),
      legHeight: Math.max(0, Math.min(0.3, result.appearance.legHeight)),
      seatHeight: Math.max(0.25, Math.min(0.65, result.appearance.seatHeight)),
      armHeight: Math.max(0.35, Math.min(0.85, result.appearance.armHeight)),
      backDepth: Math.max(0.08, Math.min(0.35, result.appearance.backDepth)),
      softness: Math.max(0.01, Math.min(0.15, result.appearance.softness)),
      ...(armWidth !== undefined ? { armWidth: Math.max(0.03, Math.min(0.2, armWidth)) } : {}),
      ...(backCushions !== undefined ? { backCushions: Math.max(1, Math.min(5, Math.round(backCushions))) } : {}),
      ...(backSlope !== undefined ? { backSlope: Math.max(0, Math.min(0.2, backSlope)) } : {}),
      ...(regularDepth !== undefined ? { regularDepth: Math.max(0.35, Math.min(1, regularDepth)) } : {}),
      ...(cushionHeight !== undefined ? { cushionHeight: Math.max(0.06, Math.min(0.24, cushionHeight)) } : {}),
      ...(backHeight !== undefined ? { backHeight: Math.max(0.3, Math.min(0.75, backHeight)) } : {}),
      ...(legThickness !== undefined ? { legThickness: Math.max(0.012, Math.min(0.08, legThickness)) } : {}),
    },
    w: read("width"), d: read("depth"), h: read("height"),
    sourceUrl: "", missingDimensions,
    dimensionSource: ["width", "depth", "height"].map((key) => {
      const dimension = result[key as "width" | "depth" | "height"];
      return `${key}: ${dimension.evidence || "Not readable"}`;
    }).join("\n") + (result.notes ? `\n${result.notes.slice(0, 500)}` : ""),
  };
}