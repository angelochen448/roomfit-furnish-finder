import { useRef, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Scan, Loader2, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeRoom } from "@/lib/room-photo.functions";
import type { RoomAnalysis } from "@/lib/room-photo";

export function RoomPhotoAnalysis({ photo, analysis, onAnalysis, onAlign, onClear }: {
  photo: string; analysis: RoomAnalysis | null; onAnalysis: (analysis: RoomAnalysis) => void;
  onAlign: () => void; onClear: () => void;
}) {
  const analyze = useServerFn(analyzeRoom);
  const active = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setError(null); setPending(false); return () => { active.current?.abort(); active.current = null; }; }, [photo]);
  const run = async () => {
    const controller = new AbortController(); active.current = controller; setPending(true); setError(null);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Room photo could not be opened.")); image.src = photo; });
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas"); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext("2d"); if (!context) throw new Error("Room photo could not be opened.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (controller.signal.aborted) return;
      const result = await analyze({ signal: controller.signal, data: { image: canvas.toDataURL("image/jpeg", 0.85) } });
      if (active.current !== controller || controller.signal.aborted) return;
      if (result.analysis) onAnalysis(result.analysis);
      setError(result.error);
    } catch (e) { if (active.current === controller && !controller.signal.aborted) setError(e instanceof Error ? e.message : "Room analysis failed."); }
    finally { if (active.current === controller) { active.current = null; setPending(false); } }
  };
  return <div className="space-y-3">
    <Button className="w-full" disabled={pending} onClick={run}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Scan className="size-4" />}{pending ? "Reading room…" : "Analyze room"}</Button>
    {pending && <Button className="w-full" variant="outline" onClick={() => { active.current?.abort(); active.current = null; setPending(false); }}><X className="size-4" />Cancel analysis</Button>}
    {error && <p role="alert" className="text-xs text-destructive break-words">{error}</p>}
    {analysis && <div className="space-y-2">
      <p role="status" className="text-xs text-muted-foreground">{analysis.view === "overhead" ? "Overhead view · estimated alignment" : analysis.floor ? "Floor alignment estimated" : analysis.rearEdge ? "Rear floor edge found · partial alignment" : "Furniture detected · room boundaries not visible"} · {analysis.furniture.length} existing item{analysis.furniture.length === 1 ? "" : "s"}</p>
      <p className="text-xs text-muted-foreground">Estimated occupied areas · review before placing. Room dimensions must be measured.</p>
      {analysis.notes && <p className="text-xs text-muted-foreground break-words">{analysis.notes}</p>}
      {(analysis.floor || analysis.rearEdge || analysis.view === "overhead" || analysis.furniture.some(o => o.footprint.length >= 3)) && <Button className="w-full" variant="outline" onClick={onAlign}><RotateCcw className="size-4" />Apply floor alignment</Button>}
      {analysis.furniture.map((o, index) => <div key={index} className="flex items-center justify-between gap-2 border-b border-border py-2">
        <span className="text-xs break-words">{o.label} · {Math.round(o.confidence * 100)}%</span>
        <Button variant="ghost" size="icon" className="shrink-0" aria-label={`Remove detection ${o.label}`} title="Remove incorrect detection" onClick={() => onAnalysis({ ...analysis, furniture: analysis.furniture.filter((_, i) => i !== index) })}><X className="size-4" /></Button>
      </div>)}
      <Button variant="ghost" className="w-full" onClick={onClear}><X className="size-4" />Clear detections</Button>
    </div>}
  </div>;
}