import type { PlacedItem } from "@/lib/room";
import { SeatingMesh } from "./SeatingMesh";
import { DimensionedFurniture } from "./DimensionedFurniture";

function B({ p, s, c, r = 0.6 }: { p: [number, number, number]; s: [number, number, number]; c: string; r?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} />
    </mesh>
  );
}

const LEG = "#3a2c22";

/** Procedural furniture built in its own local space, origin at floor center. */
export function FurnitureMesh({ item }: { item: PlacedItem }) {
  if (item.type === "sofa" || (item.type === "armchair" && item.appearance) || item.structure) return <DimensionedFurniture w={item.w} d={item.d} h={item.h}><FurnitureParts item={item} /></DimensionedFurniture>;
  return <FurnitureParts item={item} />;
}

function FurnitureParts({ item }: { item: PlacedItem }) {
  const { w, d, h, color: c } = item;
  if ((item.type === "sofa" || item.type === "armchair") && item.appearance) return <SeatingMesh item={item} />;
  if (item.structure && ["coffeeTable", "desk", "cabinet", "shelf", "bed"].includes(item.type)) return <StructuralParts item={item} />;
  switch (item.type) {
    case "cabinet": {
      const leg = Math.min(0.1, h * 0.12);
      const doors = Math.max(1, Math.round(w / 0.6));
      return <group>
        <B p={[0, (h + leg) / 2, 0]} s={[w, h - leg, d - 0.02]} c={c} />
        {Array.from({ length: doors }, (_, i) => <B key={i} p={[-w / 2 + (i + 0.5) * w / doors, (h + leg) / 2, d / 2 - 0.01]} s={[w / doors - 0.004, h - leg - 0.004, 0.02]} c={c} r={0.8} />)}
        {[-1, 1].flatMap((x) => [-1, 1].map((z) => <B key={`${x}${z}`} p={[x * (w / 2 - 0.04), leg / 2, z * (d / 2 - 0.04)]} s={[0.04, leg, 0.04]} c={c} />))}
      </group>;
    }
    case "sofa":
      return (
        <group scale={[w, h, d]}>
          <B p={[0, 0.3, 0]} s={[1, 0.36, 1]} c={c} r={0.9} />
          <B p={[0, 0.7, -0.39]} s={[1, 0.6, 0.22]} c={c} r={0.9} />
          <B p={[-0.45, 0.53, 0]} s={[0.1, 0.54, 1]} c={c} r={0.9} />
          <B p={[0.45, 0.53, 0]} s={[0.1, 0.54, 1]} c={c} r={0.9} />
          <B p={[-0.2, 0.54, 0.06]} s={[0.38, 0.14, 0.72]} c={c} r={1} />
          <B p={[0.2, 0.54, 0.06]} s={[0.38, 0.14, 0.72]} c={c} r={1} />
          <B p={[0, 0.06, 0]} s={[0.95, 0.12, 0.9]} c={LEG} />
        </group>
      );
    case "armchair":
      return (
        <group>
          <B p={[0, 0.3, 0]} s={[w, 0.25, d]} c={c} r={0.9} />
          <B p={[0, h * 0.62, -d / 2 + 0.09]} s={[w, h * 0.55, 0.18]} c={c} r={0.9} />
          <B p={[-w / 2 + 0.08, 0.5, 0]} s={[0.16, 0.35, d]} c={c} r={0.9} />
          <B p={[w / 2 - 0.08, 0.5, 0]} s={[0.16, 0.35, d]} c={c} r={0.9} />
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <B key={`${sx}${sz}`} p={[sx * (w / 2 - 0.08), 0.09, sz * (d / 2 - 0.08)]} s={[0.05, 0.18, 0.05]} c={LEG} />
          )))}
        </group>
      );
    case "coffeeTable":
    case "desk":
      return (
        <group>
          <B p={[0, h - 0.025, 0]} s={[w, 0.05, d]} c={c} r={0.4} />
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <B key={`${sx}${sz}`} p={[sx * (w / 2 - 0.06), (h - 0.05) / 2, sz * (d / 2 - 0.06)]} s={[0.05, h - 0.05, 0.05]} c={LEG} />
          )))}
        </group>
      );
    case "bed":
      return (
        <group>
          <B p={[0, 0.17, 0]} s={[w, 0.3, d]} c="#6b4a33" />
          <B p={[0, 0.42, 0.05]} s={[w - 0.06, 0.22, d - 0.12]} c="#f3eee6" r={1} />
          <B p={[0, 0.55, 0.3]} s={[w - 0.04, 0.06, d * 0.6]} c={c} r={1} />
          <B p={[-w / 4, 0.6, -d / 2 + 0.3]} s={[w / 2 - 0.15, 0.14, 0.35]} c="#ffffff" r={1} />
          <B p={[w / 4, 0.6, -d / 2 + 0.3]} s={[w / 2 - 0.15, 0.14, 0.35]} c="#ffffff" r={1} />
          <B p={[0, h / 2, -d / 2 + 0.04]} s={[w, h, 0.08]} c="#6b4a33" />
        </group>
      );
    case "lamp":
      return (
        <group>
          <mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.16, 0.18, 0.04, 24]} /><meshStandardMaterial color={c} metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.015, 0.015, h, 8]} /><meshStandardMaterial color={c} metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[0, h - 0.12, 0]} castShadow><cylinderGeometry args={[0.12, 0.2, 0.3, 24, 1, true]} /><meshStandardMaterial color="#f1e6cf" side={2} emissive="#f6d79a" emissiveIntensity={0.4} /></mesh>
        </group>
      );
    case "rug":
      return <B p={[0, h / 2, 0]} s={[w, h, d]} c={c} r={1} />;
    case "shelf":
      return (
        <group>
          <B p={[-w / 2 + 0.02, h / 2, 0]} s={[0.04, h, d]} c={c} />
          <B p={[w / 2 - 0.02, h / 2, 0]} s={[0.04, h, d]} c={c} />
          <B p={[0, h / 2, -d / 2 + 0.01]} s={[w, h, 0.02]} c={c} />
          {[0, 1, 2, 3, 4].map((i) => (
            <B key={i} p={[0, 0.02 + (i * (h - 0.04)) / 4, 0]} s={[w, 0.03, d]} c={c} />
          ))}
          {["#a8433a", "#3f5f6b", "#c9a14a", "#55704f"].map((bookColor, i) => (
            <B key={`b${i}`} p={[-w / 4 + (i % 2) * 0.2, 0.14 + (i * (h - 0.04)) / 4, 0]} s={[0.25, 0.22, d * 0.7]} c={bookColor} r={0.8} />
          ))}
        </group>
      );
  }
}

/** Image-driven variants reuse the existing primitive renderer and bounds wrapper. */
function StructuralParts({ item }: { item: PlacedItem }) {
  const { w, d, h, color: c, structure: a } = item;
  if (!a) return null;
  const t = Math.min(h * (a.thickness ?? 0.05), w * 0.12, d * 0.12);
  const legW = Math.min(w, d) * (a.legThickness ?? 0.05);
  const panel = (key: string, p: [number, number, number], s: [number, number, number]) => <mesh key={key} name={key} position={p} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={c} metalness={a.material === "metal" ? 0.7 : 0} roughness={a.material === "glass" ? 0.12 : a.material === "metal" ? 0.4 : 0.7} transparent={a.material === "glass"} opacity={a.material === "glass" ? 0.48 : 1} /></mesh>;
  if (item.type === "coffeeTable" || item.type === "desk") return <group>
    {panel("top", [0, h - t / 2, 0], [w, t, d])}
    {a.supports === "pedestal" ? <>
      {panel("pedestal", [0, (h - t) / 2, 0], [Math.max(legW, w * 0.12), h - t, Math.max(legW, d * 0.12)])}
      {panel("foot", [0, t / 2, 0], [w * 0.55, t, d * 0.65])}
    </> : a.supports === "panels" ? [-1, 1].map(x => panel(`support${x}`, [x * (w / 2 - t / 2), (h - t) / 2, 0], [t, h - t, d * 0.85])) : [-1, 1].flatMap(x => [-1, 1].map(z => panel(`leg${x}${z}`, [x * (w / 2 - legW), (h - t) / 2, z * (d / 2 - legW)], [legW, h - t, legW])))}
  </group>;
  if (item.type === "bed") return <group>
    {panel("bed-frame", [0, h * 0.23, 0], [w, h * 0.24, d])}
    <B p={[0, h * 0.43, t / 2]} s={[w - t * 2, h * 0.16, d - t * 3]} c={c} r={0.95} />
    {panel("headboard", [0, h / 2, -d / 2 + t / 2], [w, h, t])}
    {[-1, 1].flatMap(x => [-1, 1].map(z => panel(`leg${x}${z}`, [x * (w / 2 - legW), h * 0.055, z * (d / 2 - legW)], [legW, h * 0.11, legW])))}
  </group>;
  const count = a.panels ?? (item.type === "shelf" ? 5 : 2);
  return <group>
    {[-1, 1].map(x => panel(`side${x}`, [x * (w - t) / 2, h / 2, 0], [t, h, d]))}
    {!a.openBack && panel("rear", [0, h / 2, -(d - t) / 2], [w, h, t])}
    {Array.from({ length: item.type === "shelf" ? Math.max(2, count) : 2 }, (_, i) => {
      const levels = item.type === "shelf" ? Math.max(2, count) : 2;
      return panel(`level${i}`, [0, t / 2 + i * (h - t) / (levels - 1), 0], [w - t * 2, t, d]);
    })}
    {item.type === "cabinet" && Array.from({ length: count }, (_, i) => panel(`door${i}`, [-w / 2 + w / count * (i + 0.5), h / 2, (d - t) / 2], [w / count - t * 0.15, h - t * 2, t]))}
  </group>;
}
