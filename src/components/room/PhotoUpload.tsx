import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSupportedPhoto } from "@/lib/photo-upload";

export interface UploadedPhoto { name: string; data: string }
export function PhotoUpload({ label, photos, disabled, onChange, onError }: { label: string; photos: UploadedPhoto[]; disabled: boolean; onChange: (photos: UploadedPhoto[]) => void; onError: (error: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="space-y-2">
    <input ref={input} className="hidden" type="file" aria-label={label} accept="image/*" multiple disabled={disabled} onChange={async (event) => {
      const files = Array.from(event.target.files ?? []); event.target.value = "";
      if (photos.length + files.length > 4) { onError("Choose up to 4 photos per group."); return; }
      if (files.some((file) => !isSupportedPhoto(file))) { onError("Choose JPG, PNG, WebP or AVIF photos up to 8 MB each."); return; }
      try {
        // Re-encode every format the browser can display (AVIF, WebP, PNG…) as JPEG so analysis always receives a supported image.
        const added = await Promise.all(files.map((file) => new Promise<UploadedPhoto>((resolve, reject) => {
          const url = URL.createObjectURL(file); const image = new Image();
          image.onload = () => {
            const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement("canvas"); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
            const context = canvas.getContext("2d"); URL.revokeObjectURL(url);
            if (!context || !canvas.width) { reject(new Error(`${file.name} could not be opened.`)); return; }
            context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve({ name: file.name, data: canvas.toDataURL("image/jpeg", 0.9) });
          };
          image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} could not be opened in this browser. Try a JPG or PNG.`)); };
          image.src = url;
        })));
        onChange([...photos, ...added]);
      } catch (e) { onError(e instanceof Error ? e.message : "Photo could not be opened."); }
    }} />
    <Button type="button" variant="outline" className="h-auto min-h-9 w-full whitespace-normal" disabled={disabled || photos.length >= 4} onClick={() => input.current?.click()}><ImagePlus className="size-4 shrink-0" />{label}</Button>
    <div className="grid grid-cols-2 gap-2">
      {photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative min-w-0">
        <img src={photo.data} alt={photo.name} className="aspect-square w-full rounded border border-border object-contain bg-muted" />
        <Button type="button" variant="secondary" size="icon" className="absolute right-1 top-1 size-7" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} disabled={disabled} onClick={() => onChange(photos.filter((_, i) => i !== index))}><X className="size-3" /></Button>
      </div>)}
    </div>
  </div>;
}