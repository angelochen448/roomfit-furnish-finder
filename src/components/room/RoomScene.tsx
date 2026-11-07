import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Grid, Lightformer, Line } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clampToRoom, itemProblems, footprint, type PlacedItem, type Room } from "@/lib/room";
import { FurnitureMesh } from "./Furniture";

export interface CameraRig {
  height: number; // camera eye height, m
  distance: number; // from room center, m
  yaw: number; // degrees
  pitch: number; // degrees downward
  fov: number;
}

interface Props {
  room: Room;
  items: PlacedItem[];
  selectedId: string | null;
  showGrid: boolean;
  rig: CameraRig;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, z: number) => void;
}

function Rig({ rig }: { rig: CameraRig }) {
  const { camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const yaw = THREE.MathUtils.degToRad(rig.yaw);
    const pitch = THREE.MathUtils.degToRad(rig.pitch);
    cam.fov = rig.fov;
    cam.position.set(Math.sin(yaw) * rig.distance, rig.height, Math.cos(yaw) * rig.distance);
    cam.rotation.order = "YXZ";
    cam.rotation.set(-pitch, yaw, 0);
    cam.updateProjectionMatrix();
  }, [camera, rig]);
  return null;
}

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

function Item({ item, problems, selected, room, onSelect, onMove }: {
  item: PlacedItem; problems: string[]; selected: boolean; room: Room;
  onSelect: (id: string) => void; onMove: (id: string, x: number, z: number) => void;
}) {
  const offset = useRef<{ x: number; z: number } | null>(null);
  const f = footprint(item);
  const bad = problems.length > 0;

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(item.id);
    (e.target as Element).setPointerCapture(e.pointerId);
    if (e.ray.intersectPlane(FLOOR, hit)) offset.current = { x: item.x - hit.x, z: item.z - hit.z };
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!offset.current) return;
    if (e.ray.intersectPlane(FLOOR, hit)) {
      const p = clampToRoom(hit.x + offset.current.x, hit.z + offset.current.z, room);
      onMove(item.id, Math.round(p.x * 20) / 20, Math.round(p.z * 20) / 20);
    }
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    offset.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <group position={[item.x, 0, item.z]}>
      <group rotation-y={THREE.MathUtils.degToRad(item.rot)} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
        <FurnitureMesh item={item} />
      </group>
      {(selected || bad) && (
        <Line
          points={[[-f.w / 2, 0.01, -f.d / 2], [f.w / 2, 0.01, -f.d / 2], [f.w / 2, 0.01, f.d / 2], [-f.w / 2, 0.01, f.d / 2], [-f.w / 2, 0.01, -f.d / 2]]}
          color={bad ? "#e5484d" : "#f5b56b"}
          lineWidth={bad ? 3 : 2}
          dashed={!bad}
          dashSize={0.1}
          gapSize={0.06}
        />
      )}
    </group>
  );
}

export function RoomScene({ room, items, selectedId, showGrid, rig, onSelect, onMove }: Props) {
  const problems = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, itemProblems(i, items, room)])),
    [items, room],
  );
  const hw = room.width / 2, hd = room.depth / 2;

  return (
    <Canvas
      shadows
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      camera={{ fov: rig.fov, near: 0.05, far: 100 }}
      onPointerMissed={() => onSelect(null)}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.domElement.parentElement?.parentElement?.setAttribute("data-scene-ready", "true");
      }}
    >
      <Rig rig={rig} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1} color="#ffe2c4" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>

      {/* Invisible floor that only catches shadows so furniture sits in the photo. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[room.width + 4, room.depth + 4]} />
        <shadowMaterial opacity={0.35} />
      </mesh>

      {showGrid && (
        <>
          <Grid args={[room.width, room.depth]} cellSize={0.5} cellThickness={0.6} sectionSize={1}
            sectionThickness={1.2} cellColor="#ffffff" sectionColor="#f5b56b" fadeDistance={40} position={[0, 0.002, 0]} />
          <Line points={[[-hw, 0.005, -hd], [hw, 0.005, -hd], [hw, 0.005, hd], [-hw, 0.005, hd], [-hw, 0.005, -hd]]}
            color="#f5b56b" lineWidth={2.5} />
          <Line points={[[-hw, 0, -hd], [-hw, room.height, -hd], [hw, room.height, -hd], [hw, 0, -hd]]}
            color="#ffffff" lineWidth={1} transparent opacity={0.5} />
        </>
      )}

      {items.map((it) => (
        <Item key={it.id} item={it} problems={problems[it.id] ?? []} selected={it.id === selectedId}
          room={room} onSelect={onSelect} onMove={onMove} />
      ))}
    </Canvas>
  );
}
