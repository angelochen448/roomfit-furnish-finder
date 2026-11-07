// Pure room-planning rules: no React, no three.js. Units are meters.
import type { FurnitureAssembly } from "./furniture-parts";

export type FurnitureType = "sofa" | "armchair" | "chair" | "stool" | "table" | "coffeeTable" | "bed" | "desk" | "lamp" | "rug" | "shelf" | "cabinet";

export interface CatalogEntry {
  type: FurnitureType;
  label: string;
  w: number; // width (x)
  d: number; // depth (z)
  h: number; // height (y)
  color: string;
  appearance?: SeatingAppearance;
  structure?: StructuralAppearance;
  assembly?: FurnitureAssembly;
}

/** Optional image-supported structural traits; all thicknesses are visual fractions. */
export interface StructuralAppearance {
  supports?: "fourLegs" | "pedestal" | "panels" | "trestle" | "sled";
  topShape?: "rectangular" | "round" | "oval";
  legStyle?: "straight" | "tapered" | "splayed";
  seatShape?: "rectangular" | "round" | "oval";
  backStyle?: "none" | "solid" | "slatted";
  seatLevel?: number;
  footrest?: boolean;
  headboard?: "none" | "solid" | "slatted" | "upholstered";
  mattressHeight?: number;
  drawers?: number;
  thickness?: number;
  legThickness?: number;
  panels?: number;
  openBack?: boolean;
  material?: "wood" | "metal" | "glass" | "painted";
}

/** Visual proportions only; confirmed overall dimensions remain the fit source of truth. */
export interface SeatingAppearance {
  arms: "none" | "slim" | "wide" | "rolled";
  seats: number;
  back: "single" | "split" | "tufted";
  legs: "hidden" | "wood" | "metal";
  legHeight: number;
  seatHeight: number;
  armHeight: number;
  backDepth: number;
  softness: number;
  chaise: "none" | "left" | "right";
  armWidth?: number;
  backCushions?: number;
  backSlope?: number;
  seatCushion?: "bench" | "split";
  legShape?: "block" | "tapered" | "splayed" | "sled";
  regularDepth?: number;
  silhouette?: "boxy" | "rounded" | "plush";
  armProfile?: "rectangular" | "rounded" | "rolled" | "sloped";
  cushionHeight?: number;
  backHeight?: number;
  legThickness?: number;
  upholstery?: "woven" | "velvet" | "leather";
}

export const CATALOG: CatalogEntry[] = [
  { type: "chair", label: "Chair", w: 0.48, d: 0.52, h: 0.85, color: "#9d896f", structure: { backStyle: "slatted", seatLevel: 0.53 } },
  { type: "stool", label: "Stool", w: 0.4, d: 0.4, h: 0.65, color: "#9d896f", structure: { seatShape: "round", backStyle: "none", legStyle: "splayed", footrest: true } },
  { type: "table", label: "Table", w: 1.2, d: 1.2, h: 0.75, color: "#9d896f", structure: { topShape: "round", supports: "pedestal" } },
  { type: "sofa", label: "Sofa", w: 2.1, d: 0.9, h: 0.85, color: "#7a8b6f" },
  { type: "armchair", label: "Armchair", w: 0.85, d: 0.85, h: 0.9, color: "#c26a4a" },
  { type: "coffeeTable", label: "Coffee table", w: 1.1, d: 0.6, h: 0.42, color: "#8a5a3b" },
  { type: "bed", label: "Queen bed", w: 1.6, d: 2.1, h: 0.95, color: "#d9cbb4" },
  { type: "desk", label: "Desk", w: 1.4, d: 0.7, h: 0.75, color: "#a07a55" },
  { type: "lamp", label: "Floor lamp", w: 0.4, d: 0.4, h: 1.6, color: "#2f2a26" },
  { type: "rug", label: "Rug", w: 2.0, d: 1.4, h: 0.02, color: "#b9a68a" },
  { type: "shelf", label: "Bookshelf", w: 0.9, d: 0.35, h: 1.8, color: "#5b4636" },
];

export interface PlacedItem {
  id: string;
  type: FurnitureType;
  label: string;
  x: number; // center
  z: number;
  rot: 0 | 90 | 180 | 270;
  w: number;
  d: number;
  h: number;
  color: string;
  appearance?: SeatingAppearance;
  structure?: StructuralAppearance;
  assembly?: FurnitureAssembly;
}

export interface Room {
  width: number; // x
  depth: number; // z
  height: number;
}

export function footprint(item: Pick<PlacedItem, "w" | "d" | "rot">) {
  const swapped = item.rot === 90 || item.rot === 270;
  return { w: swapped ? item.d : item.w, d: swapped ? item.w : item.d };
}

const EPS = 1e-6;

export function fitsInRoom(item: PlacedItem, room: Room): boolean {
  const f = footprint(item);
  return (
    Math.abs(item.x) + f.w / 2 <= room.width / 2 + EPS &&
    Math.abs(item.z) + f.d / 2 <= room.depth / 2 + EPS &&
    item.h <= room.height + EPS
  );
}

/** Rugs lie flat, so other items may sit on them. */
export function overlaps(a: PlacedItem, b: PlacedItem): boolean {
  if (a.type === "rug" || b.type === "rug") return false;
  const fa = footprint(a);
  const fb = footprint(b);
  return (
    Math.abs(a.x - b.x) < (fa.w + fb.w) / 2 - EPS && Math.abs(a.z - b.z) < (fa.d + fb.d) / 2 - EPS
  );
}

export function itemProblems(item: PlacedItem, all: PlacedItem[], room: Room): string[] {
  const out: string[] = [];
  if (!fitsInRoom(item, room)) out.push("Outside room bounds");
  for (const o of all) if (o.id !== item.id && overlaps(item, o)) out.push(`Overlaps ${o.label}`);
  return out;
}

/** Keep the center inside the room so a dragged item can't be lost off-floor. */
export function clampToRoom(x: number, z: number, room: Room) {
  const hx = room.width / 2;
  const hz = room.depth / 2;
  return { x: Math.max(-hx, Math.min(hx, x)), z: Math.max(-hz, Math.min(hz, z)) };
}
