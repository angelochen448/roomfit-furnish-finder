import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Link2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importIkeaProduct } from "@/lib/product-import.functions";
import { ikeaUrlSchema, type ImportedProduct } from "@/lib/product-import";
import type { CatalogEntry } from "@/lib/room";
import { importMeasurementPhotos } from "@/lib/measurement-photo.functions";
import { PhotoUpload, type UploadedPhoto } from "./PhotoUpload";

export function ProductLinkImport({ onAdd }: { onAdd: (product: CatalogEntry) => void }) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ImportedProduct | null>(null);
  const importProduct = useServerFn(importIkeaProduct);
  const importPhotos = useServerFn(importMeasurementPhotos);
  const [mode, setMode] = useState<"link" | "photos">("link");
  const [photos, setPhotos] = useState<{ name: string; data: string }[]>([]);
  const [productPhotos, setProductPhotos] = useState<UploadedPhoto[]>([]);
  const [name, setName] = useState("");
  return <section className="mb-6 space-y-3 border-b border-border pb-5">
    <h2 className="eyebrow">Import furniture</h2>
    <div className="flex gap-1" role="group" aria-label="Import source">
      <Button variant={mode === "link" ? "secondary" : "ghost"} size="sm" disabled={pending} onClick={() => { setMode("link"); setProduct(null); setError(null); }}><Link2 className="size-4" />Link</Button>
      <Button variant={mode === "photos" ? "secondary" : "ghost"} size="sm" disabled={pending} onClick={() => { setMode("photos"); setProduct(null); setError(null); }}><ImagePlus className="size-4" />Link + photos</Button>
    </div>
    {mode === "link" ? <form className="space-y-2" onSubmit={async (event) => {
      event.preventDefault(); setError(null); setProduct(null);
      const parsed = ikeaUrlSchema.safeParse(url);
      if (!parsed.success) { setError("Use a full English-language IKEA product link."); return; }
      setPending(true);
      try { const result = await importProduct({ data: { url: parsed.data } }); setProduct(result.product); setError(result.error); }
      catch (e) { setError(e instanceof Error ? e.message : "The product could not be read."); }
      finally { setPending(false); }
    }}>
      <Label htmlFor="product-url">Product link</Label>
      <Input id="product-url" type="url" required maxLength={2048} placeholder="https://www.ikea.com/…" value={url} onChange={(e) => setUrl(e.target.value)} disabled={pending} />
      <Button className="w-full" type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}{pending ? "Reading product…" : "Import product"}</Button>
    </form> : <form className="space-y-3" onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setError(null); setProduct(null);
      try { const result = await importPhotos({ data: { images: photos.map((photo) => photo.data), productImages: productPhotos.map((photo) => photo.data), name, url } }); setProduct(result.product); setError(result.error); }
      catch (e) { setError(e instanceof Error ? e.message : "The photos could not be read."); }
      finally { setPending(false); }
    }}>
      <Label htmlFor="photo-product-url">IKEA link (optional)</Label>
      <Input id="photo-product-url" type="url" value={url} maxLength={2048} disabled={pending} placeholder="https://www.ikea.com/…" onChange={(e) => { setUrl(e.target.value); setProduct(null); }} />
      <Label htmlFor="photo-product-name">Product name (optional)</Label>
      <Input id="photo-product-name" value={name} maxLength={100} disabled={pending} placeholder="IKEA PS chair-bed" onChange={(e) => setName(e.target.value)} />
      <PhotoUpload label="Product photos" photos={productPhotos} disabled={pending} onChange={(next) => { setProductPhotos(next); setProduct(null); }} onError={setError} />
      <PhotoUpload label="Measurement diagrams" photos={photos} disabled={pending} onChange={(next) => { setPhotos(next); setProduct(null); }} onError={setError} />
      <Button type="submit" className="w-full" disabled={pending || photos.length === 0}>{pending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{pending ? "Matching furniture…" : "Match furniture"}</Button>
    </form>}
    {error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}
    {product && <div className="space-y-3">
      <div className="text-sm font-medium break-words">{product.label}</div>
      <div className="text-xs text-muted-foreground">{product.sourceUrl ? "IKEA dimensions" : "Photo measurements · review required"} · approximate shape</div>
      {product.appearance && <p className="text-xs text-muted-foreground">{product.appearance.arms === "none" ? "Armless" : `${product.appearance.arms} arms`} · {product.appearance.seats} seat{product.appearance.seats > 1 ? "s" : ""} · {product.appearance.legs} legs</p>}
      {product.missingDimensions.length > 0 && <p role="status" className="text-xs text-destructive">Overall {product.missingDimensions.join(" / ")} not verified. Enter the measured overall size before adding. Seat depth and bed length are not chair depth.</p>}
      {mode === "photos" && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Measurement evidence</summary><p className="mt-2 whitespace-pre-line break-words">{product.dimensionSource}</p></details>}
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
        {(["w", "d", "h"] as const).map((key, i) => <div key={key} className="space-y-1">
          <Label htmlFor={`product-${key}`} className="text-xs">{["Width", "Depth", "Height"][i]} (cm)</Label>
          <Input id={`product-${key}`} type="number" min={0.1} max={1500} step={0.01} placeholder="Required" value={product[key] > 0 ? Math.round(product[key] * 10000) / 100 : ""} onChange={(e) => setProduct({ ...product, [key]: Number(e.target.value) / 100 })} />
        </div>)}
      </div>
      {product.sourceUrl && <a className="text-xs text-primary underline" href={product.sourceUrl} target="_blank" rel="noreferrer">View IKEA product</a>}
      <Button className="w-full" disabled={[product.w, product.d, product.h].some((v) => !Number.isFinite(v) || v <= 0 || v > 15)} onClick={() => onAdd(product)}><Plus className="size-4" />Add to room</Button>
    </div>}
  </section>;
}