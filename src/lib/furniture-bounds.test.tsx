import { createElement, useLayoutEffect } from "react";
import { describe, expect, it } from "vitest";
import { createRoot } from "@react-three/fiber";
import { Box3, Group, Mesh, Vector3 } from "three";
import { FurnitureMesh } from "@/components/room/Furniture";
import type { PlacedItem, SeatingAppearance } from "./room";

const appearance: SeatingAppearance = { arms: "wide", seats: 3, back: "split", legs: "wood", legHeight: 0.15, seatHeight: 0.5, armHeight: 0.7, backDepth: 0.2, softness: 0.08, chaise: "none" };
const dimensions = [[2.1, 0.9, 0.85], [1.4, 0.65, 0.6], [3.2, 1.5, 1.2], [0.8, 0.5, 0.4]];
const variants: Array<[string, SeatingAppearance | undefined]> = [
  ["link-only fallback", undefined], ["photographed sofa", appearance],
  ["armless hidden legs", { ...appearance, arms: "none", legs: "hidden" }],
  ["conflicting proportions", { ...appearance, seatHeight: 0.25, legHeight: 0.3, arms: "rolled", chaise: "left" }],
];

async function renderSofa(item: PlacedItem) {
  const canvas = document.createElement("canvas");
  const root = createRoot(canvas);
  // Exercise the actual R3F/Drei geometry without requiring a GPU.
  const renderer = { render: () => {}, setSize: () => {}, setPixelRatio: () => {}, dispose: () => {}, forceContextLoss: () => {}, renderLists: { dispose: () => {} }, xr: { enabled: false, isPresenting: false, addEventListener: () => {}, removeEventListener: () => {} }, shadowMap: {}, domElement: canvas };
  await root.configure({ gl: renderer as never, frameloop: "never", events: undefined, size: { width: 640, height: 480, top: 0, left: 0 } });
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
    const item: PlacedItem = { id: "imported-sofa", type: "sofa", label: "Imported sofa", x: 0, z: 0, rot: 0, w, d, h, color: "#889988", appearance: settings };
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
      for (const axis of ["x", "y", "z"] as const) {
        expect(part.min[axis]).toBeGreaterThanOrEqual(bounds.min[axis] - 0.00001);
        expect(part.max[axis]).toBeLessThanOrEqual(bounds.max[axis] + 0.00001);
      }
    });
    expect(meshes).toBeGreaterThan(3);
    expect(item.appearance).toEqual(settings);
    cleanup();
  });
});