import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import type { ImportedProduct } from "@/lib/product-import";
import { FurnitureMesh } from "./Furniture";

export function FurnitureComparison({ product, photo }: { product: ImportedProduct; photo: string | undefined }) {
  const valid = [product.w, product.d, product.h].every(n => n > 0 && Number.isFinite(n));
  return <div className="grid grid-cols-2 gap-2">
    <div className="min-w-0"><div className="mb-1 text-xs text-muted-foreground">Product photo</div>{photo && <img src={photo} alt="Original furniture" className="aspect-square w-full rounded border border-border bg-muted object-contain" />}</div>
    <div className="min-w-0"><div className="mb-1 text-xs text-muted-foreground">Approximation</div><div className="aspect-square overflow-hidden rounded border border-border bg-muted" aria-label="Furniture likeness preview">
      {valid && product.assembly?.supported !== false ? <Canvas camera={{ position: [3, 2, 3], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.5} /><directionalLight position={[3, 5, 4]} intensity={2} />
        <Bounds fit clip observe margin={1.3}><FurnitureMesh item={{ ...product, id: "review", x: 0, z: 0, rot: 0 }} /></Bounds>
        <OrbitControls makeDefault enablePan={false} />
      </Canvas> : <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">{product.assembly?.supported === false ? "No matching model" : "Confirm dimensions to preview"}</div>}
    </div></div>
  </div>;
}