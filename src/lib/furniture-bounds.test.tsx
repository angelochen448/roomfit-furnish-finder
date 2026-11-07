import { createElement, useLayoutEffect } from "react";
import { describe, expect, it } from "vitest";
import { createRoot, extend } from "@react-three/fiber";
import * as THREE from "three";
import { Box3, Group, Mesh, Vector3 } from "three";
import { FurnitureMesh } from "@/components/room/Furniture";
import type { PlacedItem, SeatingAppearance } from "./room";

extend({ Group: THREE.Group, Mesh: THREE.Mesh, BoxGeometry: THREE.BoxGeometry, CylinderGeometry: THREE.CylinderGeometry, ExtrudeGeometry: THREE.ExtrudeGeometry, MeshStandardMaterial: THREE.MeshStandardMaterial });

const appearance: SeatingAppearance = { arms: "wide", seats: 3, back: "split", legs: "wood", legHeight: 0.15, seatHeight: 0.5, armHeight: 0.7, backDepth: 0.2, softness: 0.08, chaise: "none" };
const dimensions = [[2.1, 0.9, 0.85], [1.4, 0.65, 0.6], [3.2, 1.5, 1.2], [0.8, 0.5, 0.4]];
const variants: Array<[string, SeatingAppearance | undefined]> = [
  ["link-only fallback", undefined], ["photographed sofa", appearance],
  ["armless hidden legs", { ...appearance, arms: "none", legs: "hidden" }],
  ["conflicting proportions", { ...appearance, seatHeight: 0.25, legHeight: 0.3, arms: "rolled", chaise: "left" }],
  ["rolled tufted classic", { ...appearance, arms: "rolled", back: "tufted", backCushions: 1, seatCushion: "bench", legShape: "tapered", backSlope: 0.08 }],
  ["slim modern chaise", { ...appearance, arms: "slim", armWidth: 0.05, chaise: "left", regularDepth: 0.55, backCushions: 2, legShape: "sled" }],
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
  it("renders rolled arms, six tuft panels, a bench cushion and tapered legs", async () => {
    const { group, cleanup } = await renderSofa({ ...item, appearance: variants[4]?.[1] });
    expect(group.getObjectByName("arm-roll1")?.geometry.type).toBe("CylinderGeometry");
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
    const { group, cleanup } = await renderSofa({ ...item, appearance: variants[5]?.[1] });
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