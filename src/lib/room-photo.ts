import { z } from "zod";
import * as THREE from "three";
import { footprint, fitsInRoom, type CatalogEntry, type PlacedItem, type Room } from "./room";

const point = z.object({ x: z.number(), y: z.number() });
export const roomVisionSchema = z.object({
  floor: z.object({ backLeft: point, backRight: point, frontRight: point, frontLeft: point, confidence: z.number() }).nullable(),
  furniture: z.array(z.object({ label: z.string(), footprint: z.array(point), confidence: z.number() })),
  notes: z.string(),
});
export const roomPhotoInputSchema = z.object({ image: z.string().max(12_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/) });
export type ImagePoint = z.infer<typeof point>;
export type RoomAnalysis = z.infer<typeof roomVisionSchema>;
export interface RoomCamera { height: number; distance: number; yaw: number; pitch: number; fov: number }
export interface PhotoFrame { width: number; height: number; imageWidth: number; imageHeight: number }
export interface OccupiedArea { id: string; label: string; x: number; z: number; w: number; d: number }

// object-cover mapping is shared by analysis calibration and obstacle projection.
export function imageToViewport(p: ImagePoint, frame: PhotoFrame): ImagePoint {
  const scale = Math.max(frame.width / frame.imageWidth, frame.height / frame.imageHeight);
  return { x: (p.x * frame.imageWidth * scale + (frame.width - frame.imageWidth * scale) / 2) / frame.width,
    y: (p.y * frame.imageHeight * scale + (frame.height - frame.imageHeight * scale) / 2) / frame.height };
}
export function roomCamera(rig: RoomCamera, alignment: ImagePoint, frame: PhotoFrame) {
  const camera = new THREE.PerspectiveCamera(rig.fov, frame.width / frame.height, 0.05, 100);
  const yaw = THREE.MathUtils.degToRad(rig.yaw);
  camera.position.set(Math.sin(yaw) * rig.distance, rig.height, Math.cos(yaw) * rig.distance);
  camera.rotation.order = "YXZ";
  camera.rotation.set(-THREE.MathUtils.degToRad(rig.pitch), yaw, 0);
  camera.setViewOffset(frame.width, frame.height, -alignment.x * frame.width, -alignment.y * frame.height, frame.width, frame.height);
  camera.updateMatrixWorld();
  return camera;
}
export function imageFloorPoint(p: ImagePoint, camera: THREE.PerspectiveCamera, frame: PhotoFrame) {
  const v = imageToViewport(p, frame);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(v.x * 2 - 1, 1 - v.y * 2), camera);
  const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  return hit && Math.abs(hit.x) < 100 && Math.abs(hit.z) < 100 ? { x: hit.x, z: hit.z } : null;
}
export function normalizeRoomAnalysis(input: RoomAnalysis): RoomAnalysis {
  const validPoint = (p: ImagePoint) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
  const floor = input.floor;
  const validFloor = floor && [floor.backLeft, floor.backRight, floor.frontRight, floor.frontLeft].every(validPoint)
    && floor.confidence >= 0.5 && floor.backRight.x > floor.backLeft.x
    && floor.frontRight.x > floor.frontLeft.x && (floor.frontLeft.y + floor.frontRight.y) > (floor.backLeft.y + floor.backRight.y) + 0.1;
  return { floor: validFloor ? floor : null, furniture: input.furniture.slice(0, 20)
    .map(o => ({ ...o, footprint: o.footprint.length >= 3 && o.footprint.length <= 8 && o.footprint.every(validPoint) ? o.footprint : [], label: o.label.slice(0, 80) || "Existing furniture", confidence: Math.max(0, Math.min(1, o.confidence)) })), notes: input.notes.slice(0, 800) };
}

/** Fit camera perspective to the estimated room-floor quad; no dimensions are inferred. */
export function calibrateFloor(analysis: RoomAnalysis, room: Room, frame: PhotoFrame, initial: RoomCamera) {
  if (!analysis.floor) return null;
  const floor = analysis.floor;
  const targets = [floor.backLeft, floor.backRight, floor.frontRight, floor.frontLeft].map(p => imageToViewport(p, frame));
  const corners = [[-room.width / 2, 0, -room.depth / 2], [room.width / 2, 0, -room.depth / 2], [room.width / 2, 0, room.depth / 2], [-room.width / 2, 0, room.depth / 2]];
  const limits = [[0.5, 3], [1, 10], [-60, 60], [-10, 60], [30, 100], [-1.5, 1.5], [-1.5, 1.5]];
  const score = (v: number[]) => {
    const [height = 1.6, distance = 4.2, yaw = 0, pitch = 14, fov = 60, x = 0, y = 0] = v;
    const camera = roomCamera({ height, distance, yaw, pitch, fov }, { x, y }, frame);
    return corners.reduce((sum, c, i) => {
      const t = targets[i]; if (!t) return Infinity;
      const p = new THREE.Vector3(c[0], c[1], c[2]);
      if (p.clone().applyMatrix4(camera.matrixWorldInverse).z >= -0.1) return Infinity;
      p.project(camera);
      return sum + ((p.x + 1) / 2 - t.x) ** 2 + ((1 - p.y) / 2 - t.y) ** 2;
    }, 0);
  };
  let best = [initial.height, Math.max(initial.distance, room.depth / 2 + 1), initial.yaw, initial.pitch, initial.fov, 0, 0];
  let error = score(best);
  for (let pass = 0; pass < 10; pass++) {
    const steps = [0.3, 0.8, 8, 8, 10, 0.1, 0.1].map(s => s * 0.65 ** pass);
    for (let repeat = 0; repeat < 8; repeat++) for (let axis = 0; axis < 7; axis++) for (const direction of [-1, 1]) {
      const bounds = limits[axis]; const step = steps[axis]; const value = best[axis];
      if (!bounds || step === undefined || value === undefined) continue;
      const next = [...best]; next[axis] = Math.max(bounds[0] ?? 0, Math.min(bounds[1] ?? 0, value + step * direction));
      const nextError = score(next); if (nextError < error) { best = next; error = nextError; }
    }
  }
  if (!Number.isFinite(error) || error > 0.12) return null;
  const [height = 1.6, distance = 4.2, yaw = 0, pitch = 14, fov = 60, x = 0, y = 0] = best;
  return { rig: { height, distance, yaw, pitch, fov }, alignment: { x, y }, error };
}
export function occupiedAreas(analysis: RoomAnalysis | null, rig: RoomCamera, alignment: ImagePoint, frame: PhotoFrame) {
  if (!analysis) return { areas: [] as OccupiedArea[], unresolved: 0 };
  const camera = roomCamera(rig, alignment, frame);
  const areas: OccupiedArea[] = []; let unresolved = 0;
  analysis.furniture.forEach((o, i) => {
    if (o.footprint.length < 3) { unresolved++; return; }
    const points = o.footprint.map(p => imageFloorPoint(p, camera, frame));
    if (points.some(p => !p)) { unresolved++; return; }
    const xs = points.flatMap(p => p ? [p.x] : []), zs = points.flatMap(p => p ? [p.z] : []);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    areas.push({ id: String(i), label: o.label, x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, w: Math.max(0.1, maxX - minX) + 0.1, d: Math.max(0.1, maxZ - minZ) + 0.1 });
  });
  return { areas, unresolved };
}
export function occupiedBy(item: Pick<PlacedItem, "x" | "z" | "w" | "d" | "rot">, areas: OccupiedArea[]) {
  const size = footprint(item);
  return areas.find(a => Math.abs(item.x - a.x) < (size.w + a.w) / 2 && Math.abs(item.z - a.z) < (size.d + a.d) / 2);
}
export function findOpenPosition(item: CatalogEntry, room: Room, areas: OccupiedArea[]) {
  const candidates = [{ x: 0, z: 0 }];
  for (let x = -room.width / 2; x <= room.width / 2; x += 0.2) for (let z = -room.depth / 2; z <= room.depth / 2; z += 0.2) candidates.push({ x, z });
  candidates.sort((a, b) => a.x ** 2 + a.z ** 2 - b.x ** 2 - b.z ** 2);
  return candidates.find(p => fitsInRoom({ ...item, ...p, id: "candidate", rot: 0 }, room) && !occupiedBy({ ...item, ...p, rot: 0 }, areas));
}