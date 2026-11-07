import { z } from "zod";

const vector = z.object({ x: z.number(), y: z.number(), z: z.number() });
export const furniturePartSchema = z.object({
  label: z.string(),
  shape: z.enum(["box", "cylinder", "ellipsoid", "beam"]),
  position: vector, size: vector, rotation: vector,
  start: vector, end: vector,
  color: z.string(), material: z.enum(["wood", "metal", "glass", "fabric", "painted"]),
});
export const furnitureAssemblySchema = z.object({
  supported: z.boolean(), limitations: z.string(), parts: z.array(furniturePartSchema),
});
export type FurnitureAssembly = z.infer<typeof furnitureAssemblySchema>;
export type FurniturePart = z.infer<typeof furniturePartSchema>;

/** Reject unsafe/degenerate geometry, never turn part proportions into measurements. */
export function validateAssembly(value: FurnitureAssembly): FurnitureAssembly {
  const invalid = value.parts.length < 1 || value.parts.length > 48 || value.parts.some(p => {
    const vectors = [p.position, p.size, p.rotation, p.start, p.end];
    if (vectors.some(v => Object.values(v).some(n => !Number.isFinite(n)))) return true;
    if ([p.size.x, p.size.y, p.size.z].some(n => n < 0.005 || n > 1.5)) return true;
    if ([p.position, p.start, p.end].some(v => Math.abs(v.x) > 0.75 || v.y < 0 || v.y > 1.25 || Math.abs(v.z) > 0.75)) return true;
    if (Object.values(p.rotation).some(n => Math.abs(n) > 180)) return true;
    if (p.shape === "beam" && Math.hypot(p.start.x - p.end.x, p.start.y - p.end.y, p.start.z - p.end.z) < 0.005) return true;
    return !/^#[0-9a-f]{6}$/i.test(p.color);
  });
  return invalid ? { supported: false, limitations: "The visible construction could not be represented reliably. No matching model is available.", parts: [] } : value;
}