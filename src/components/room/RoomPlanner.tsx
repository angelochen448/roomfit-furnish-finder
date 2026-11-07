import { useEffect, useMemo, useRef, useState } from "react";
import { Move, RotateCw, Trash2, Upload, Grid3x3, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CATALOG, itemProblems, type CatalogEntry, type PlacedItem, type Room } from "@/lib/room";
import { RoomScene, type CameraRig } from "./RoomScene";
import sampleRoom from "@/assets/sample-room.jpg";
import { ProductLinkImport } from "./ProductLinkImport";
import { RoomPhotoAnalysis } from "./RoomPhotoAnalysis";
import { calibrateFloor, occupiedAreas, occupiedBy, findOpenPosition, type RoomAnalysis, type PhotoFrame } from "@/lib/room-photo";

const DEFAULT_RIG: CameraRig = { height: 1.6, distance: 4.2, yaw: 0, pitch: 14, fov: 60 };

export function RoomPlanner() {
  const [photo, setPhoto] = useState<string>(sampleRoom);
  const [room, setRoom] = useState<Room>({ width: 4.5, depth: 4, height: 2.6 });
  const [rig, setRig] = useState<CameraRig>(DEFAULT_RIG);
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [movingGrid, setMovingGrid] = useState(false);
  const [alignment, setAlignment] = useState({ x: 0, y: 0 });
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [frame, setFrame] = useState<PhotoFrame>({ width: 1, height: 1, imageWidth: 1, imageHeight: 1 });
  const scene = useRef<HTMLElement | null>(null);
  const gridDrag = useRef<{ pointerId: number; x: number; y: number; origin: { x: number; y: number }; width: number; height: number } | null>(null);

  useEffect(() => () => {
    if (photo.startsWith("blob:")) URL.revokeObjectURL(photo);
  }, [photo]);
  useEffect(() => {
    const element = scene.current; if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setFrame(f => ({ ...f, width: entry.contentRect.width, height: entry.contentRect.height })); });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const occupied = useMemo(() => occupiedAreas(analysis, rig, alignment, frame), [analysis, rig, alignment, frame]);
  const alignFloor = (result: RoomAnalysis) => {
    const suggestion = calibrateFloor(result, room, frame, rig);
    if (suggestion) { setRig(suggestion.rig); setAlignment(suggestion.alignment); setShowGrid(true); setPlacementError(null); }
    else setPlacementError(null);
  };

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const allProblems = useMemo(() => items.map((i) => ({ i, p: [...itemProblems(i, items, room), ...(occupiedBy(i, occupied.areas) ? ["Occupied by existing furniture"] : [])] })), [items, room, occupied.areas]);
  const badCount = allProblems.filter((x) => x.p.length).length;

  const add = (c: CatalogEntry) => {
    if (occupied.unresolved) { setPlacementError("An existing item's floor position is unclear. Adjust alignment or remove the incorrect detection before placing."); return; }
    const position = findOpenPosition(c, room, occupied.areas);
    if (!position && occupied.areas.length) { setPlacementError("No unoccupied space fits this furniture. Existing furniture areas are blocked."); return; }
    setPlacementError(null);
    const id = crypto.randomUUID();
    setItems((s) => [...s, { ...c, id, x: position?.x ?? 0, z: position?.z ?? 0, rot: 0 }]);
    setSelectedId(id);
  };
  const patch = (id: string, p: Partial<PlacedItem>) => {
    const current = items.find(i => i.id === id); if (!current) return;
    const moving = p.x !== undefined || p.z !== undefined || p.rot !== undefined;
    const obstacle = occupiedBy({ ...current, ...p }, occupied.areas);
    if (moving && (obstacle || occupied.unresolved)) { setPlacementError(obstacle ? `That spot is occupied by ${obstacle.label}.` : "Existing furniture position unclear; review detections first."); return; }
    setPlacementError(null); setItems(s => s.map(i => i.id === id ? { ...i, ...p } : i));
  };

  const onFile = (f?: File) => {
    if (!f) return;
    setAnalysis(null); setPlacementError(null); setMovingGrid(false);
    setPhoto(URL.createObjectURL(f));
  };

  const snapshot = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-scene-ready] canvas");
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const out = document.createElement("canvas");
      out.width = canvas.width; out.height = canvas.height;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      const s = Math.max(out.width / img.width, out.height / img.height);
      ctx.drawImage(img, (out.width - img.width * s) / 2, (out.height - img.height * s) / 2, img.width * s, img.height * s);
      ctx.drawImage(canvas, 0, 0);
      const a = document.createElement("a");
      a.href = out.toDataURL("image/png"); a.download = "room-preview.png"; a.click();
    };
    img.src = photo;
  };

  const rigSlider = (key: keyof CameraRig, label: string, min: number, max: number, step: number, unit: string) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{Math.round(rig[key] * 100) / 100}{unit}</span></div>
      <Slider value={[rig[key]]} min={min} max={max} step={step} onValueChange={([v]) => setRig((r) => ({ ...r, [key]: v }))} />
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl">Nestwise</h1>
          <span className="text-sm text-muted-foreground">Room studio</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer"><Upload className="size-4" />Upload room photo
              <input type="file" accept="image/*" aria-label="Upload room photo" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setShowGrid((g) => !g); setMovingGrid(false); }}><Grid3x3 className="size-4" />{showGrid ? "Hide" : "Show"} grid</Button>
          <Button variant={movingGrid ? "default" : "outline"} size="sm" aria-pressed={movingGrid} onClick={() => { setMovingGrid(value => !value); setShowGrid(true); }}>{movingGrid ? <CheckCircle2 className="size-4" /> : <Move className="size-4" />}{movingGrid ? "Done moving" : "Move grid"}</Button>
          <Button size="sm" onClick={snapshot}><Download className="size-4" />Save preview</Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="order-3 w-full shrink-0 space-y-6 overflow-y-auto border-t border-border p-5 lg:order-1 lg:w-72 lg:border-r lg:border-t-0">
          <section className="space-y-3">
            <h2 className="eyebrow">Room size (m)</h2>
            <div className="grid grid-cols-3 gap-2">
              {(["width", "depth", "height"] as const).map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs capitalize text-muted-foreground">{k}</Label>
                  <Input type="number" step={0.1} min={1} value={room[k]}
                    onChange={(e) => setRoom((r) => ({ ...r, [k]: Math.max(1, Number(e.target.value) || 1) }))} />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="eyebrow">Match the photo</h2>
            {rigSlider("height", "Camera height", 0.5, Math.max(10, rig.height), 0.05, "m")}
            {rigSlider("distance", "Distance", 0.01, 10, 0.1, "m")}
            {rigSlider("pitch", "Tilt down", -10, 89.9, 1, "°")}
            {rigSlider("yaw", "Turn", -60, 60, 1, "°")}
            {rigSlider("fov", "Lens width", 30, 100, 1, "°")}
            <Button variant="ghost" size="sm" onClick={() => { setRig(DEFAULT_RIG); setAlignment({ x: 0, y: 0 }); }}>Reset view</Button>
          </section>
        </aside>

        <main ref={scene} data-occupied-count={occupied.areas.length} className="relative order-1 h-[55dvh] min-h-80 min-w-0 overflow-hidden bg-muted lg:order-2 lg:h-auto lg:flex-1">
          <img src={photo} alt="Your room" className="absolute inset-0 size-full object-cover" onLoad={event => { const img = event.currentTarget; setFrame(f => ({ ...f, imageWidth: img.naturalWidth, imageHeight: img.naturalHeight })); }} />
          <div className="absolute inset-0"><RoomScene room={room} items={items} selectedId={selectedId} showGrid={showGrid}
            rig={rig} alignment={alignment} occupied={occupied.areas} onSelect={setSelectedId} onMove={(id, x, z) => patch(id, { x, z })} /></div>
          {movingGrid && <div aria-label="Drag floor grid" data-alignment-x={alignment.x} data-alignment-y={alignment.y} className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => {
              if (gridDrag.current || event.button !== 0) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              gridDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: alignment, width: bounds.width, height: bounds.height };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = gridDrag.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              setAlignment({ x: drag.origin.x + (event.clientX - drag.x) / drag.width, y: drag.origin.y + (event.clientY - drag.y) / drag.height });
            }}
            onPointerUp={(event) => {
              if (gridDrag.current?.pointerId !== event.pointerId) return;
              gridDrag.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => { gridDrag.current = null; }} onLostPointerCapture={() => { gridDrag.current = null; }} />}

          <div className="pointer-events-none absolute left-4 top-4">
            {items.length > 0 && (
              <div className={`fit-badge ${badCount ? "fit-badge-bad" : "fit-badge-ok"}`}>
                {badCount ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
                {badCount ? `${badCount} item${badCount > 1 ? "s" : ""} don't fit` : "Everything fits"}
              </div>
            )}
          </div>
          {placementError && <p role="alert" className="absolute left-4 right-4 top-16 border border-border bg-background p-3 text-xs text-destructive break-words">{placementError}</p>}

          {selected && !movingGrid && (
            <div className="panel absolute bottom-4 left-1/2 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 px-4 py-3">
              <div>
                <div className="font-medium">{selected.label}</div>
                <div className="font-mono text-xs text-muted-foreground">{[selected.w, selected.d, selected.h].map((v) => v.toFixed(3)).join(" × ")} m</div>
                {allProblems.find(p => p.i.id === selected.id)?.p.map((p) => <div key={p} className="text-xs text-destructive">{p}</div>)}
              </div>
              <input type="color" value={selected.color} onChange={(e) => patch(selected.id, { color: e.target.value })}
                className="size-8 cursor-pointer rounded border border-border bg-transparent" aria-label="Color" />
              <Button variant="outline" size="icon" aria-label="Rotate" onClick={() => patch(selected.id, { rot: ((selected.rot + 90) % 360) as PlacedItem["rot"] })}><RotateCw className="size-4" /></Button>
              <Button variant="outline" size="icon" aria-label="Remove" onClick={() => { setItems((s) => s.filter((i) => i.id !== selected.id)); setSelectedId(null); }}><Trash2 className="size-4" /></Button>
            </div>
          )}
        </main>

        <aside className="order-2 w-full shrink-0 overflow-y-auto border-t border-border p-5 lg:order-3 lg:w-64 lg:border-l lg:border-t-0">
          <section className="mb-6 space-y-3 border-b border-border pb-5">
            <h2 className="eyebrow">Your room photo</h2>
            <img src={photo} alt="Current room photo" className="aspect-video w-full rounded border border-border object-cover" />
            <Button variant="outline" className="w-full" asChild>
              <label className="cursor-pointer"><Upload className="size-4" />Choose room photo
                <input type="file" accept="image/*" aria-label="Choose room photo" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            </Button>
            <RoomPhotoAnalysis photo={photo} analysis={analysis} onAnalysis={result => { setAnalysis(result); if (!analysis) alignFloor(result); }} onAlign={() => { if (analysis) alignFloor(analysis); }} onClear={() => { setAnalysis(null); setPlacementError(null); }} />
            {occupied.unresolved > 0 && <p role="status" className="text-xs text-destructive">{occupied.unresolved} occupied area{occupied.unresolved === 1 ? "" : "s"} could not be located. Placement paused until reviewed.</p>}
          </section>
          <ProductLinkImport onAdd={add} />
          <h2 className="eyebrow mb-3">Add furniture</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {CATALOG.map((c) => (
              <Button variant="outline" key={c.type} onClick={() => add(c)} className="catalog-tile h-auto whitespace-normal">
                <span className="size-6 rounded-full" style={{ background: c.color }} />
                <span className="text-sm font-medium">{c.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{c.w}×{c.d} m</span>
              </Button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
