import { createElement, useLayoutEffect } from "react";
import { describe, expect, it } from "vitest";
import { createRoot, extend } from "@react-three/fiber";
import * as THREE from "three";
import { Box3, Group, Mesh, Vector3 } from "three";
import { FurnitureMesh } from "@/components/room/Furniture";
import type { PlacedItem, SeatingAppearance } from "./room";
import { CATALOG } from "./room";
import { productFromPhoto, type PhotoResult } from "./measurement-photo";

extend({ Group: THREE.Group, Mesh: THREE.Mesh, BoxGeometry: THREE.BoxGeometry, CylinderGeometry: THREE.CylinderGeometry, ExtrudeGeometry: THREE.ExtrudeGeometry, MeshStandardMaterial: THREE.MeshStandardMaterial });

const appearance: SeatingAppearance = { arms: "wide", seats: 3, back: "split", legs: "wood", legHeight: 0.15, seatHeight: 0.5, armHeight: 0.7, backDepth: 0.2, softness: 0.08, chaise: "none" };
const dimensions = [[2.1, 0.9, 0.85], [1.4, 0.65, 0.6], [3.2, 1.5, 1.2], [0.8, 0.5, 0.4]];
const variants: Array<[string, SeatingAppearance | undefined]> = [
  ["link-only fallback", undefined], ["photographed sofa", appearance],
  ["armless hidden legs", { ...appearance, arms: "none", legs: "hidden" }],
  ["conflicting proportions", { ...appearance, seatHeight: 0.25, legHeight: 0.3, arms: "rolled", chaise: "left" }],
  ["rolled tufted classic", { ...appearance, arms: "rolled", back: "tufted", backCushions: 1, seatCushion: "bench", legShape: "tapered", backSlope: 0.08 }],
  ["slim modern chaise", { ...appearance, arms: "slim", armWidth: 0.05, chaise: "left", regularDepth: 0.55, backCushions: 2, legShape: "sled" }],
  ["charcoal boxy bench reference", { ...appearance, silhouette: "boxy", armProfile: "rectangular", arms: "wide", back: "single", seats: 2, backCushions: 1, seatCushion: "bench", cushionHeight: 0.1, legs: "metal", legThickness: 0.018, upholstery: "woven" }],
  ["plush sloped split sofa", { ...appearance, silhouette: "plush", armProfile: "sloped", cushionHeight: 0.2, backHeight: 0.5, legShape: "splayed", upholstery: "velvet" }],
];

async function renderSofa(item: PlacedItem) {
  const canvas = document.createElement("canvas");
  const root = createRoot(canvas);
  // Exercise the actual R3F/Drei geometry without requiring a GPU.
  const renderer = { render: () => {}, setSize: () => {}, setPixelRatio: () => {}, dispose: () => {}, forceContextLoss: () => {}, renderLists: { dispose: () => {} }, xr: { enabled: false, isPresenting: false, addEventListener: () => {}, removeEventListener: () => {} }, shadowMap: {}, domElement: canvas };
  await root.configure({ gl: renderer as never, frameloop: "never", size: { width: 640, height: 480, top: 0, left: 0 } });
  const group = await new Promise<Group>((resolve) => {
    function Probe() {
      const parent = new Group();
      useLayoutEffect(() => { resolve(parent); }, [parent]);
      return createElement("primitive", { object: parent }, createElement(FurnitureMesh, { item }));
    }
    root.render(createElement(Probe));
  });
  return { group, cleanup: () => root.unmount() };
}

describe.each(variants)("sofa bounds: %s", (_, settings) => {
  it.each(dimensions)("complete geometry equals %s × %s × %s m and every part stays inside", async (w, d, h) => {
    const item: PlacedItem = { id: "imported-sofa", type: "sofa", label: "Imported sofa", x: 0, z: 0, rot: 0, w, d, h, color: "#889988", ...(settings ? { appearance: settings } : {}) };
    const { group, cleanup } = await renderSofa(item);
    group.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(group, true);
    const size = bounds.getSize(new Vector3());
    expect(size.x).toBeCloseTo(w, 5);
    expect(size.y).toBeCloseTo(h, 5);
    expect(size.z).toBeCloseTo(d, 5);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    expect(bounds.min.x).toBeCloseTo(-w / 2, 5);
    expect(bounds.min.z).toBeCloseTo(-d / 2, 5);
    let meshes = 0;
    group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      meshes++;
      const part = new Box3().setFromObject(object, true);
      const expectedMin = { x: -w / 2, y: 0, z: -d / 2 };
      const expectedMax = { x: w / 2, y: h, z: d / 2 };
      for (const axis of ["x", "y", "z"] as const) {
        expect(part.min[axis]).toBeGreaterThanOrEqual(expectedMin[axis] - 0.00001);
        expect(part.max[axis]).toBeLessThanOrEqual(expectedMax[axis] + 0.00001);
      }
    });
    expect(meshes).toBeGreaterThan(3);
    expect(item.appearance).toEqual(settings);
    cleanup();
  });
});

describe("imported seating silhouette", () => {
  const item: PlacedItem = { id: "test", type: "sofa", label: "Test sofa", x: 0, z: 0, rot: 0, w: 2.4, d: 1.5, h: 0.85, color: "#889988" };
  it("carries the described charcoal bench traits from photo validation to actual geometry", async () => {
    const settings = variants[6]?.[1];
    if (!settings) throw new Error("Missing reference fixture");
    const result: PhotoResult = { label: "Charcoal sofa", type: "sofa", color: "gray", bodyColor: "#353535", notes: "", appearance: settings,
      width: { value: 180, unit: "cm", kind: "overall", evidence: "180 cm overall width" },
      depth: { value: 85, unit: "cm", kind: "overall", evidence: "85 cm overall depth" },
      height: { value: 80, unit: "cm", kind: "overall", evidence: "80 cm overall height" } };
    const product = productFromPhoto(result);
    const { group, cleanup } = await renderSofa({ ...item, ...product });
    expect(group.getObjectByName("seat1")).toBeUndefined();
    expect(group.getObjectByName("back1")).toBeUndefined();
    const arm = group.getObjectByName("arm1"), leg = group.getObjectByName("leg1-0"), seat = group.getObjectByName("seat0");
    if (!(arm instanceof Mesh) || !(leg instanceof Mesh) || !(seat instanceof Mesh)) throw new Error("Missing reference components");
    expect(leg.geometry.type).toBe("CylinderGeometry");
    const legSize = new Box3().setFromObject(leg, true).getSize(new Vector3());
    expect(legSize.x).toBeLessThan(0.02);
    const material = seat.material as THREE.MeshStandardMaterial;
    expect(material.bumpMap).not.toBeNull();
    expect(material.color.getHexString()).toBe("353535");
    const bounds = new Box3().setFromObject(group, true).getSize(new Vector3());
    expect(bounds.x).toBeCloseTo(1.8, 5); expect(bounds.z).toBeCloseTo(0.85, 5); expect(bounds.y).toBeCloseTo(0.8, 5);
    cleanup();
  });
  it("renders a contrasting sloped plush design with separate cushions and velvet material", async () => {
    const settings = variants[7]?.[1];
    if (!settings) throw new Error("Missing plush fixture");
    const { group, cleanup } = await renderSofa({ ...item, appearance: settings });
    expect(group.getObjectByName("sloped-arm")).toBeDefined();
    expect(group.getObjectByName("seat2")).toBeDefined();
    const seat = group.getObjectByName("seat0");
    if (!(seat instanceof Mesh)) throw new Error("Missing seat");
    expect((seat.material as THREE.MeshStandardMaterial).roughness).toBe(0.85);
    cleanup();
  });
  it("renders rolled arms, six tuft panels, a bench cushion and tapered legs", async () => {
    const settings = variants[4]?.[1];
    if (!settings) throw new Error("Missing classic fixture");
    const { group, cleanup } = await renderSofa({ ...item, appearance: settings });
    const roll = group.getObjectByName("arm-roll1");
    expect(roll instanceof Mesh && roll.geometry.type).toBe("CylinderGeometry");
    let tufts = 0;
    group.traverse((o) => { if (o.name.startsWith("tuft")) tufts++; });
    expect(tufts).toBe(6);
    expect(group.getObjectByName("seat0")).toBeDefined();
    expect(group.getObjectByName("seat1")).toBeUndefined();
    const leg = group.getObjectByName("leg1-0");
    expect(leg instanceof Mesh && leg.geometry.type).toBe("CylinderGeometry");
    cleanup();
  });
  it("makes a front-view left chaise base and cushion longer, with independent back cushions and sled rails", async () => {
    const settings = variants[5]?.[1];
    if (!settings) throw new Error("Missing chaise fixture");
    const { group, cleanup } = await renderSofa({ ...item, appearance: settings });
    group.updateWorldMatrix(true, true);
    const left = group.getObjectByName("base2"), right = group.getObjectByName("base0");
    if (!left || !right) throw new Error("Missing chaise bases");
    const leftBox = new Box3().setFromObject(left, true), rightBox = new Box3().setFromObject(right, true);
    expect(leftBox.getSize(new Vector3()).z).toBeGreaterThan(rightBox.getSize(new Vector3()).z * 1.5);
    expect(leftBox.getCenter(new Vector3()).x).toBeGreaterThan(0);
    expect(group.getObjectByName("back2")).toBeUndefined();
    expect(group.getObjectByName("back1")).toBeDefined();
    expect(group.getObjectByName("rail1")).toBeDefined();
    cleanup();
  });
  it("normalizes an armless imported armchair to its confirmed dimensions", async () => {
    const { group, cleanup } = await renderSofa({ ...item, type: "armchair", w: 0.8, d: 0.84, h: 0.75, appearance: { ...appearance, arms: "none", seats: 1, legs: "hidden" } });
    const box = new Box3().setFromObject(group, true), size = box.getSize(new Vector3());
    expect(size.x).toBeCloseTo(0.8, 5);
    expect(size.z).toBeCloseTo(0.84, 5);
    expect(size.y).toBeCloseTo(0.75, 5);
    expect(box.min.y).toBeCloseTo(0, 5);
    cleanup();
  });
});

describe("existing and appearance-driven furniture categories", () => {
  it.each([
    { type: "table" as const, structure: { topShape: "oval" as const, supports: "pedestal" as const }, part: "shape-top", geometry: "CylinderGeometry" },
    { type: "table" as const, structure: { topShape: "rectangular" as const, supports: "trestle" as const }, part: "trestle-stretcher", geometry: "BoxGeometry" },
    { type: "chair" as const, structure: { backStyle: "slatted" as const, seatLevel: 0.5 }, part: "back-slat-0", geometry: "BoxGeometry" },
    { type: "stool" as const, structure: { seatShape: "round" as const, footrest: true, legStyle: "splayed" as const }, part: "shape-seat", geometry: "CylinderGeometry" },
    { type: "desk" as const, structure: { drawers: 3 }, part: "desk-drawer-2", geometry: "BoxGeometry" },
    { type: "bed" as const, structure: { headboard: "upholstered" as const }, part: "headboard-pad-3", geometry: "BoxGeometry" },
  ])("bounds $type with $part at confirmed dimensions", async ({ type, structure, part, geometry }) => {
    const { group, cleanup } = await renderSofa({ id: type, type, label: type, x: 0, z: 0, rot: 0, w: 1.3, d: 0.73, h: 0.91, color: "#887766", structure });
    const target = group.getObjectByName(part);
    expect(target instanceof Mesh && target.geometry.type).toBe(geometry);
    const bounds = new Box3().setFromObject(group, true), size = bounds.getSize(new Vector3());
    expect(size.x).toBeCloseTo(1.3, 5); expect(size.y).toBeCloseTo(0.91, 5); expect(size.z).toBeCloseTo(0.73, 5);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    group.traverse(o => {
      if (!(o instanceof Mesh)) return;
      const b = new Box3().setFromObject(o, true);
      expect(b.min.y).toBeGreaterThanOrEqual(-0.00001); expect(b.max.y).toBeLessThanOrEqual(0.91001);
      expect(b.min.x).toBeGreaterThanOrEqual(-0.65001); expect(b.max.x).toBeLessThanOrEqual(0.65001);
      expect(b.min.z).toBeGreaterThanOrEqual(-0.36501); expect(b.max.z).toBeLessThanOrEqual(0.36501);
    });
    if (type === "stool") { expect(group.getObjectByName("chair-back")).toBeUndefined(); expect(group.getObjectByName("footrest-x-1")).toBeDefined(); }
    cleanup();
  });
  it.each(CATALOG)("continues rendering $type", async entry => {
    const { group, cleanup } = await renderSofa({ ...entry, id: entry.type, x: 0, z: 0, rot: 0 });
    const bounds = new Box3().setFromObject(group, true);
    expect(bounds.isEmpty()).toBe(false);
    expect(bounds.getSize(new Vector3()).length()).toBeGreaterThan(0);
    cleanup();
  });
  it.each(["coffeeTable", "desk", "cabinet", "shelf", "bed"] as const)("bounds structural %s at its confirmed size", async type => {
    const { group, cleanup } = await renderSofa({ id: type, type, label: type, x: 0, z: 0, rot: 0, w: 1.4, d: 0.7, h: 0.8, color: "#887766", structure: { supports: "pedestal", thickness: 0.04, legThickness: 0.025, panels: 3, openBack: true, material: "wood" } });
    const bounds = new Box3().setFromObject(group, true), size = bounds.getSize(new Vector3());
    expect(size.x).toBeCloseTo(1.4, 5); expect(size.z).toBeCloseTo(0.7, 5); expect(size.y).toBeCloseTo(0.8, 5);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    if (type === "shelf") expect(group.getObjectByName("rear")).toBeUndefined();
    if (type === "cabinet") expect(group.getObjectByName("door2")).toBeDefined();
    cleanup();
  });
});