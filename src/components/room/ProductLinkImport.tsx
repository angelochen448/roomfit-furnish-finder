import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importIkeaProduct } from "@/lib/product-import.functions";
import { ikeaUrlSchema, type ImportedProduct } from "@/lib/product-import";
import type { CatalogEntry } from "@/lib/room";

export function ProductLinkImport({ onAdd }: { onAdd: (product: CatalogEntry) => void }) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ImportedProduct | null>(null);
  const importProduct = useServerFn(importIkeaProduct);
  return <section className="mb-6 space-y-3 border-b border-border pb-5">
    <h2 className="eyebrow">Import from IKEA</h2>
    <form className="space-y-2" onSubmit={async (event) => {
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
    </form>
    {error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}
    {product && <div className="space-y-3">
      <div className="text-sm font-medium break-words">{product.label}</div>
      <div className="text-xs text-muted-foreground">IKEA dimensions · approximate shape</div>
      <div className="grid grid-cols-3 gap-2">
        {(["w", "d", "h"] as const).map((key, i) => <div key={key} className="space-y-1">
          <Label htmlFor={`product-${key}`} className="text-xs">{["Width", "Depth", "Height"][i]} (cm)</Label>
          <Input id={`product-${key}`} type="number" min={0.1} max={1500} step={0.01} value={Math.round(product[key] * 10000) / 100} onChange={(e) => setProduct({ ...product, [key]: Number(e.target.value) / 100 })} />
        </div>)}
      </div>
      <a className="text-xs text-primary underline" href={product.sourceUrl} target="_blank" rel="noreferrer">View IKEA product</a>
      <Button className="w-full" disabled={[product.w, product.d, product.h].some((v) => !Number.isFinite(v) || v <= 0 || v > 15)} onClick={() => onAdd(product)}><Plus className="size-4" />Add to room</Button>
    </div>}
  </section>;
}