import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImportedProduct } from "@/lib/product-import";
import type { CatalogEntry } from "@/lib/room";
import { importMeasurementPhotos } from "@/lib/measurement-photo.functions";
import { PhotoUpload, type UploadedPhoto } from "./PhotoUpload";
import { FurnitureComparison } from "./FurnitureComparison";

export function ProductLinkImport({ onAdd }: { onAdd: (product: CatalogEntry) => void }) {
  const [pending, setPending] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ImportedProduct | null>(null);
  const importPhotos = useServerFn(importMeasurementPhotos);
  const [photos, setPhotos] = useState<{ name: string; data: string }[]>([]);
  const [productPhotos, setProductPhotos] = useState<UploadedPhoto[]>([]);
  return <section className="mb-6 space-y-3 border-b border-border pb-5">
    <h2 className="eyebrow">Import furniture</h2>
    <form className="space-y-3" onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setError(null); setProduct(null);
      const controller = new AbortController(); activeRequest.current = controller;
      try { const result = await importPhotos({ signal: controller.signal, data: { images: photos.map((photo) => photo.data), productImages: productPhotos.map((photo) => photo.data), name: "", url: "" } }); if (activeRequest.current === controller && !controller.signal.aborted) { setProduct(result.product); setError(result.error); } }
      catch (e) { if (activeRequest.current === controller && !controller.signal.aborted) setError(e instanceof Error ? e.message : "The photos could not be read."); }
      finally { if (activeRequest.current === controller) { activeRequest.current = null; setPending(false); } }
    }}>
      <PhotoUpload label="Product photos" photos={productPhotos} disabled={pending} onChange={(next) => { setProductPhotos(next); setProduct(null); }} onError={setError} />
      <PhotoUpload label="Measurement diagrams" photos={photos} disabled={pending} onChange={(next) => { setPhotos(next); setProduct(null); }} onError={setError} />
      <Button type="submit" className="w-full" disabled={pending || photos.length === 0}>{pending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{pending ? "Matching furniture…" : "Match furniture"}</Button>
      {pending && <Button type="button" variant="outline" className="w-full" onClick={() => { activeRequest.current?.abort(); activeRequest.current = null; setPending(false); setError("Matching cancelled."); }}><X className="size-4" />Cancel matching</Button>}
    </form>
    {error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}
    {product && <div className="space-y-3">
      <div className="text-sm font-medium break-words">{product.label}</div>
      <FurnitureComparison product={product} photo={productPhotos[0]?.data ?? photos[0]?.data} />
      {product.assembly?.limitations && <p role="status" className="text-xs text-destructive">{product.assembly.limitations}</p>}
      <div className="text-xs text-muted-foreground">{product.sourceUrl ? "IKEA dimensions" : "Photo measurements · review required"} · approximate shape</div>
      {product.appearance && <p className="text-xs text-muted-foreground">{product.appearance.arms === "none" ? "Armless" : `${product.appearance.arms} arms`} · {product.appearance.seats} seat{product.appearance.seats > 1 ? "s" : ""} · {product.appearance.legs} legs</p>}
      {product.missingDimensions.length > 0 && <p role="status" className="text-xs text-destructive">Overall {product.missingDimensions.join(" / ")} not verified. Enter the measured overall size before adding. Seat depth and bed length are not chair depth.</p>}
      <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Measurement evidence</summary><p className="mt-2 whitespace-pre-line break-words">{product.dimensionSource}</p></details>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
        {(["w", "d", "h"] as const).map((key, i) => <div key={key} className="space-y-1">
          <Label htmlFor={`product-${key}`} className="text-xs">{["Width", "Depth", "Height"][i]} (cm)</Label>
          <Input id={`product-${key}`} type="number" min={0.1} max={1500} step={0.01} placeholder="Required" value={product[key] > 0 ? Math.round(product[key] * 10000) / 100 : ""} onChange={(e) => setProduct({ ...product, [key]: Number(e.target.value) / 100 })} />
        </div>)}
      </div>
      {product.sourceUrl && <a className="text-xs text-primary underline" href={product.sourceUrl} target="_blank" rel="noreferrer">View IKEA product</a>}
      <Button className="w-full" disabled={product.assembly?.supported === false || [product.w, product.d, product.h].some((v) => !Number.isFinite(v) || v <= 0 || v > 15)} onClick={() => onAdd(product)}><Plus className="size-4" />Add to room</Button>
    </div>}
  </section>;
}