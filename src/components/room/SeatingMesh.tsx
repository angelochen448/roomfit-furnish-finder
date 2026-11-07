import { RoundedBox } from "@react-three/drei";
import type { PlacedItem } from "@/lib/room";

export function SeatingMesh({ item }: { item: PlacedItem }) {
  const a = item.appearance;
  if (!a) return null;
  const { w, d, h, color } = item;
  const radius = Math.min(w, d, h) * a.softness;
  const seatTop = h * a.seatHeight;
  const cushionH = h * 0.14;
  // Independently extracted appearance fractions can conflict; retain a positive base.
  const leg = h * Math.max(0, Math.min(a.legHeight, a.seatHeight - 0.14 - 0.06));
  const backD = d * a.backDepth;
  const armW = a.arms === "none" ? 0 : w * (a.armWidth ?? (a.arms === "slim" ? 0.07 : 0.14));
  const innerW = w - armW * 2;
  const seatD = d - backD;
  const baseH = Math.max(h * 0.06, seatTop - cushionH - leg);
  const regularD = a.chaise === "none" ? d : Math.max(backD + d * 0.1, d * (a.regularDepth ?? 0.7));
  const sections = a.chaise === "none" && a.seatCushion === "bench" ? 1 : a.seats;
  // Local +X is the left side for a viewer facing the front (+Z).
  const isChaise = (i: number) => (a.chaise === "left" && i === sections - 1) || (a.chaise === "right" && i === 0);
  const sectionDepth = (i: number) => isChaise(i) ? d : regularD;
  const block = (key: string, p: [number, number, number], s: [number, number, number], c = color, round = radius) => <RoundedBox key={key} name={key} position={p} args={s} radius={Math.min(round, ...s.map((v) => v * 0.45))} smoothness={4} castShadow receiveShadow><meshStandardMaterial color={c} roughness={0.96} /></RoundedBox>;
  return <group>
    {Array.from({ length: sections }, (_, i) => {
      const width = innerW / sections;
      const depth = sectionDepth(i);
      return block(`base${i}`, [-innerW / 2 + width * (i + 0.5), leg + baseH / 2, -d / 2 + depth / 2], [width, baseH, depth]);
    })}
    {block("back support", [0, seatTop - cushionH / 2, -d / 2 + backD / 2], [innerW, cushionH * 1.3, backD], color, radius * 0.4)}
    {Array.from({ length: sections }, (_, i) => {
      const width = innerW / sections;
      const depth = Math.min(seatD, sectionDepth(i) - backD);
      return block(`seat${i}`, [-innerW / 2 + width * (i + 0.5), seatTop - cushionH / 2, -d / 2 + backD + depth / 2], [width - w * 0.006, cushionH, depth]);
    })}
    {Array.from({ length: a.backCushions ?? (a.back === "single" ? 1 : a.seats) }, (_, i) => {
      const count = a.backCushions ?? (a.back === "single" ? 1 : a.seats);
      const width = innerW / count;
      const backH = h - seatTop;
      const slope = Math.atan2(d * (a.backSlope ?? 0), backH);
      return <group key={`back${i}`} position={[-innerW / 2 + width * (i + 0.5), seatTop, -d / 2 + backD / 2]} rotation={[-slope, 0, 0]}>
        {a.back === "tufted" ? Array.from({ length: 6 }, (_, cell) => {
          const col = cell % 3, row = Math.floor(cell / 3);
          return block(`tuft${i}-${cell}`, [(col - 1) * width / 3, (row + 0.5) * backH / 2, 0], [width / 3 - w * 0.003, backH / 2 - h * 0.004, backD], color, radius * 0.5);
        }) : block(`back${i}`, [0, backH / 2, 0], [width - w * 0.006, backH, backD])}
      </group>;
    })}
    {a.arms !== "none" && [-1, 1].map((side) => {
      const armTop = Math.max(leg + h * 0.06, Math.min(h, h * a.armHeight));
      const depth = (a.chaise === "left" && side === 1) || (a.chaise === "right" && side === -1) ? d : regularD;
      const z = -d / 2 + depth / 2;
      if (a.arms === "rolled") return <group key={`arm${side}`}>
        {block(`arm${side}`, [side * (w - armW) / 2, (leg + armTop) / 2 - armW * 0.12, z], [armW * 0.72, Math.max(h * 0.04, armTop - leg - armW * 0.24), depth])}
        <mesh name={`arm-roll${side}`} position={[side * (w - armW) / 2, armTop - armW / 2, z]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow><cylinderGeometry args={[armW / 2, armW / 2, depth, 24]} /><meshStandardMaterial color={color} roughness={0.96} /></mesh>
      </group>;
      return block(`arm${side}`, [side * (w - armW) / 2, (leg + armTop) / 2, z], [armW, armTop - leg, depth]);
    })}
    {a.legs !== "hidden" && leg > 0 && [-1, 1].flatMap((x) => {
      const depth = (a.chaise === "left" && x === 1) || (a.chaise === "right" && x === -1) ? d : regularD;
      const legColor = a.legs === "metal" ? "#343432" : "#785538";
      const front = -d / 2 + depth - d * 0.08, rear = -d * 0.42;
      if (a.legShape === "sled") return [<group key={`sled${x}`}>
        {block(`rail${x}`, [x * w * 0.4, leg * 0.08, (front + rear) / 2], [w * 0.025, leg * 0.16, front - rear + d * 0.035], legColor, 0.002)}
        {[rear, front].map((z, i) => block(`leg${x}-${i}`, [x * w * 0.4, leg / 2, z], [w * 0.025, leg, d * 0.025], legColor, 0.002))}
      </group>];
      return [rear, front].map((z, i) => a.legShape === "tapered" || a.legShape === "splayed" ? <mesh key={`leg${x}-${i}`} name={`leg${x}-${i}`} position={[x * w * 0.4, leg / 2, z]} rotation={[a.legShape === "splayed" ? (i === 0 ? -0.16 : 0.16) : 0, 0, a.legShape === "splayed" ? x * 0.16 : 0]} castShadow receiveShadow><cylinderGeometry args={[Math.min(w, d) * 0.025, Math.min(w, d) * 0.014, leg, 12]} /><meshStandardMaterial color={legColor} roughness={0.55} metalness={a.legs === "metal" ? 0.7 : 0} /></mesh> : block(`leg${x}-${i}`, [x * w * 0.4, leg / 2, z], [w * 0.035, leg, d * 0.035], legColor, 0.004));
    })}
  </group>;
}