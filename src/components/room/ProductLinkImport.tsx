import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Link2, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importIkeaProduct } from "@/lib/product-import.functions";
import { ikeaUrlSchema, type ImportedProduct } from "@/lib/product-import";
import type { CatalogEntry } from "@/lib/room";
import { importMeasurementPhotos } from "@/lib/measurement-photo.functions";

export function ProductLinkImport({ onAdd }: { onAdd: (product: CatalogEntry) => void }) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ImportedProduct | null>(null);
  const importProduct = useServerFn(importIkeaProduct);
  const importPhotos = useServerFn(importMeasurementPhotos);
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"link" | "photos">("link");
  const [photos, setPhotos] = useState<{ name: string; data: string }[]>([]);
  const [name, setName] = useState("");
  return <section className="mb-6 space-y-3 border-b border-border pb-5">
    <h2 className="eyebrow">Import furniture</h2>
    <div className="flex gap-1" role="group" aria-label="Import source">
      <Button variant={mode === "link" ? "secondary" : "ghost"} size="sm" disabled={pending} onClick={() => { setMode("link"); setProduct(null); setError(null); }}><Link2 className="size-4" />Link</Button>
      <Button variant={mode === "photos" ? "secondary" : "ghost"} size="sm" disabled={pending} onClick={() => { setMode("photos"); setProduct(null); setError(null); }}><ImagePlus className="size-4" />Photos</Button>
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
      try { const result = await importPhotos({ data: { images: photos.map((photo) => photo.data), name } }); setProduct(result.product); setError(result.error); }
      catch (e) { setError(e instanceof Error ? e.message : "The photos could not be read."); }
      finally { setPending(false); }
    }}>
      <Label htmlFor="photo-product-name">Product name (optional)</Label>
      <Input id="photo-product-name" value={name} maxLength={100} disabled={pending} placeholder="IKEA PS chair-bed" onChange={(e) => setName(e.target.value)} />
      <input ref={fileInput} className="hidden" type="file" aria-label="Measurement photos" accept="image/jpeg,image/png,image/webp" multiple disabled={pending} onChange={async (event) => {
        const files = Array.from(event.target.files ?? []); event.target.value = ""; setError(null);
        if (photos.length + files.length > 4) { setError("Choose up to 4 photos."); return; }
        if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 8 * 1024 * 1024)) { setError("Choose JPG, PNG or WebP photos up to 8 MB each."); return; }
        try {
          const added = await Promise.all(files.map((file) => new Promise<{ name: string; data: string }>((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve({ name: file.name, data: reader.result }) : reject(new Error("Photo could not be opened.")); reader.onerror = () => reject(new Error("Photo could not be opened.")); reader.readAsDataURL(file);
          })));
          setPhotos((current) => [...current, ...added].slice(0, 4)); setProduct(null);
        } catch (e) { setError(e instanceof Error ? e.message : "Photo could not be opened."); }
      }} />
      <Button type="button" variant="outline" className="w-full" disabled={pending || photos.length >= 4} onClick={() => fileInput.current?.click()}><ImagePlus className="size-4" />Upload measurement photos</Button>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative min-w-0">
          <img src={photo.data} alt={photo.name} className="aspect-square w-full rounded border border-border object-contain bg-muted" />
          <Button type="button" variant="secondary" size="icon" className="absolute right-1 top-1 size-7" aria-label={`Remove photo ${index + 1}`} disabled={pending} onClick={() => { setPhotos(photos.filter((_, i) => i !== index)); setProduct(null); }}><X className="size-3" /></Button>
        </div>)}
      </div>
      <Button type="submit" className="w-full" disabled={pending || photos.length === 0}>{pending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{pending ? "Reading measurements…" : "Read measurements"}</Button>
    </form>}
    {error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}
    {product && <div className="space-y-3">
      <div className="text-sm font-medium break-words">{product.label}</div>
      <div className="text-xs text-muted-foreground">{product.sourceUrl ? "IKEA dimensions" : "Photo measurements · review required"} · approximate shape</div>
      {product.missingDimensions.length > 0 && <p role="status" className="text-xs text-destructive">Overall {product.missingDimensions.join(" / ")} not verified. Enter the measured overall size before adding. Seat depth and bed length are not chair depth.</p>}
      {!product.sourceUrl && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Measurement evidence</summary><p className="mt-2 whitespace-pre-line break-words">{product.dimensionSource}</p></details>}
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