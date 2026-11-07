import { describe, expect, it } from "vitest";
import { calibrateFloor, imageToViewport, normalizeRoomAnalysis, occupiedAreas, occupiedBy, findOpenPosition, roomCamera, type RoomAnalysis } from "./room-photo";
import * as THREE from "three";
const room = { width: 4, depth: 3, height: 2.6 };
const rig = { height: 1.6, distance: 4.2, yaw: 0, pitch: 24, fov: 60 };
const frame = { width: 1000, height: 800, imageWidth: 1000, imageHeight: 800 };
const area = { id: "0", label: "Existing sofa", x: 0, z: 0, w: 2, d: 1 };
const item = { type: "chair" as const, label: "Chair", color: "#123456", w: 0.5, d: 0.5, h: 0.8 };
describe("AI occupied floor rules", () => {
  it("aligns a visible rear floor edge without pretending to infer scale", () => {
    const result = calibrateFloor({ floor: null, rearEdge: { left: { x: 0.2, y: 0.6 }, right: { x: 0.8, y: 0.6 }, confidence: 0.8 }, furniture: [], notes: "" }, room, frame, rig);
    expect(result?.rig).toEqual(rig);
    expect(result?.alignment.y).not.toBe(0);
  });
  it("retains unlocated furniture as unresolved instead of silently permitting placement", () => {
    const analysis = normalizeRoomAnalysis({ floor: null, furniture: [{ label: "Sofa", confidence: 0.9, footprint: [] }], notes: "" });
    expect(occupiedAreas(analysis, rig, { x: 0, y: 0 }, frame).unresolved).toBe(1);
  });
  it("blocks placement into existing furniture", () => {
    expect(occupiedBy({ ...item, x: 0.5, z: 0, rot: 0 }, [area])?.label).toBe("Existing sofa");
    expect(occupiedBy({ ...item, x: 1.6, z: 0, rot: 0 }, [area])).toBeUndefined();
  });
  it("blocks a rotated footprint that reaches an occupied area", () => {
    expect(occupiedBy({ ...item, w: 0.5, d: 2, x: 1.5, z: 0, rot: 90 }, [area])).toBe(area);
  });
  it("finds an unoccupied add position instead of placing at blocked center", () => {
    const p = findOpenPosition(item, room, [area]);
    expect(p).toBeDefined();
    if (!p) throw new Error("Missing position");
    expect(occupiedBy({ ...item, ...p, rot: 0 }, [area])).toBeUndefined();
  });
  it("refuses additions if all floor space is occupied", () => {
    expect(findOpenPosition(item, room, [{ ...area, w: 10, d: 10 }])).toBeUndefined();
  });
  it("maps image points through object-cover crop", () => {
    expect(imageToViewport({ x: 0.25, y: 0.5 }, { width: 500, height: 1000, imageWidth: 1000, imageHeight: 1000 })).toEqual({ x: 0, y: 0.5 });
  });
  it("projects detected floor footprints with the same camera and pan as rendering", () => {
    const camera = roomCamera(rig, { x: 0.12, y: -0.05 }, frame);
    const points = [[-1, 0, -0.5], [1, 0, -0.5], [1, 0, 0.5], [-1, 0, 0.5]].map(p => {
      const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
      return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
    });
    const analysis: RoomAnalysis = { floor: null, notes: "", furniture: [{ label: "Sofa", confidence: 0.9, footprint: points }] };
    expect(occupiedAreas(analysis, rig, { x: 0.12, y: -0.05 }, frame).areas[0]).toMatchObject({ label: "Sofa" });
    const a = occupiedAreas(analysis, rig, { x: 0.12, y: -0.05 }, frame).areas[0];
    expect(a?.w).toBeCloseTo(2.1); expect(a?.d).toBeCloseTo(1.1);
  });
  it("does not accept a reversed or low-confidence floor", () => {
    expect(normalizeRoomAnalysis({ floor: { backLeft: { x: 0.8, y: 0.2 }, backRight: { x: 0.2, y: 0.2 }, frontLeft: { x: 0, y: 1 }, frontRight: { x: 1, y: 1 }, confidence: 0.3 }, furniture: [], notes: "" }).floor).toBeNull();
  });
  it("calibrates a valid perspective without changing measured room dimensions", () => {
    const camera = roomCamera(rig, { x: 0, y: 0 }, frame);
    const corners = [[-2, 0, -1.5], [2, 0, -1.5], [2, 0, 1.5], [-2, 0, 1.5]].map(p => {
      const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
    });
    const [backLeft, backRight, frontRight, frontLeft] = corners;
    if (!backLeft || !backRight || !frontRight || !frontLeft) throw new Error("Missing corners");
    const result = calibrateFloor({ floor: { backLeft, backRight, frontLeft, frontRight, confidence: 0.9 }, furniture: [], notes: "" }, room, frame, rig);
    expect(result?.error).toBeLessThan(0.001);
    expect(room).toEqual({ width: 4, depth: 3, height: 2.6 });
  });
});