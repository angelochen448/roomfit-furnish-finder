import { Quaternion, Vector3 } from "three";
import type { FurnitureAssembly, FurniturePart } from "@/lib/furniture-parts";

function Part({ part }: { part: FurniturePart }) {
  const material = { color: part.color, metalness: part.material === "metal" ? 0.7 : 0, roughness: part.material === "glass" ? 0.12 : part.material === "fabric" ? 0.95 : 0.55, transparent: part.material === "glass", opacity: part.material === "glass" ? 0.45 : 1 };
  const rotation: [number, number, number] = [part.rotation.x, part.rotation.y, part.rotation.z].map(n => n * Math.PI / 180) as [number, number, number];
  if (part.shape === "beam") {
    const start = new Vector3(part.start.x, part.start.y, part.start.z);
    const end = new Vector3(part.end.x, part.end.y, part.end.z);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
    return <mesh name={`part-${part.label}`} position={start.add(end).multiplyScalar(0.5)} quaternion={quaternion} castShadow receiveShadow><boxGeometry args={[part.size.x, length, part.size.z]} /><meshStandardMaterial {...material} /></mesh>;
  }
  return <mesh name={`part-${part.label}`} position={[part.position.x, part.position.y, part.position.z]} rotation={rotation} scale={[part.size.x, part.size.y, part.size.z]} castShadow receiveShadow>
    {part.shape === "cylinder" ? <cylinderGeometry args={[0.5, 0.5, 1, 48]} /> : part.shape === "ellipsoid" ? <sphereGeometry args={[0.5, 32, 20]} /> : <boxGeometry args={[1, 1, 1]} />}
    <meshStandardMaterial {...material} />
  </mesh>;
}
export function PartFurniture({ assembly }: { assembly: FurnitureAssembly }) {
  return <group>{assembly.parts.map((part, i) => <Part key={i} part={part} />)}</group>;
}