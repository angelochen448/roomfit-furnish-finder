import { useMemo, useState } from "react";
import { RotateCw, Trash2, Upload, Grid3x3, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CATALOG, itemProblems, type CatalogEntry, type PlacedItem, type Room } from "@/lib/room";
import { RoomScene, type CameraRig } from "./RoomScene";
import sampleRoom from "@/assets/sample-room.jpg";

const DEFAULT_RIG: CameraRig = { height: 1.6, distance: 4.2, yaw: 0, pitch: 14, fov: 60 };

export function RoomPlanner() {
  const [photo, setPhoto] = useState<string>(sampleRoom);
  const [room, setRoom] = useState<Room>({ width: 4.5, depth: 4, height: 2.6 });
  const [rig, setRig] = useState<CameraRig>(DEFAULT_RIG);
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const allProblems = useMemo(() => items.map((i) => ({ i, p: itemProblems(i, items, room) })), [items, room]);
  const badCount = allProblems.filter((x) => x.p.length).length;

  const add = (c: CatalogEntry) => {
    const id = crypto.randomUUID();
    setItems((s) => [...s, { ...c, id, x: 0, z: 0, rot: 0 }]);
    setSelectedId(id);
  };
  const patch = (id: string, p: Partial<PlacedItem>) => setItems((s) => s.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const onFile = (f?: File) => {
    if (!f) return;
    setPhoto(URL.createObjectURL(f));
  };

  const snapshot = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-scene-ready] canvas");
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const out = document.createElement("canvas");
      out.width = canvas.width; out.height = canvas.height;
      const ctx = out.getContext("2d")!;
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
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{rig[key]}{unit}</span></div>
      <Slider value={[rig[key]]} min={min} max={max} step={step} onValueChange={([v]) => setRig((r) => ({ ...r, [key]: v }))} />
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl">Nestwise</h1>
          <span className="text-sm text-muted-foreground">Room studio</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer"><Upload className="size-4" />Room photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowGrid((g) => !g)}><Grid3x3 className="size-4" />{showGrid ? "Hide" : "Show"} grid</Button>
          <Button size="sm" onClick={snapshot}><Download className="size-4" />Save preview</Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 space-y-6 overflow-y-auto border-r border-border p-5">
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
            <p className="text-xs text-muted-foreground">Line the orange floor outline up with the floor in your photo.</p>
            {rigSlider("height", "Camera height", 0.5, 3, 0.05, "m")}
            {rigSlider("distance", "Distance", 1, 10, 0.1, "m")}
            {rigSlider("pitch", "Tilt down", -10, 60, 1, "°")}
            {rigSlider("yaw", "Turn", -60, 60, 1, "°")}
            {rigSlider("fov", "Lens width", 30, 100, 1, "°")}
            <Button variant="ghost" size="sm" onClick={() => setRig(DEFAULT_RIG)}>Reset view</Button>
          </section>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden bg-muted">
          <img src={photo} alt="Your room" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0"><RoomScene room={room} items={items} selectedId={selectedId} showGrid={showGrid}
            rig={rig} onSelect={setSelectedId} onMove={(id, x, z) => patch(id, { x, z })} /></div>

          <div className="pointer-events-none absolute left-4 top-4">
            {items.length > 0 && (
              <div className={`fit-badge ${badCount ? "fit-badge-bad" : "fit-badge-ok"}`}>
                {badCount ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
                {badCount ? `${badCount} item${badCount > 1 ? "s" : ""} don't fit` : "Everything fits"}
              </div>
            )}
          </div>

          {selected && (
            <div className="panel absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 px-4 py-3">
              <div>
                <div className="font-medium">{selected.label}</div>
                <div className="font-mono text-xs text-muted-foreground">{selected.w}×{selected.d}×{selected.h} m</div>
                {itemProblems(selected, items, room).map((p) => <div key={p} className="text-xs text-destructive">{p}</div>)}
              </div>
              <input type="color" value={selected.color} onChange={(e) => patch(selected.id, { color: e.target.value })}
                className="size-8 cursor-pointer rounded border border-border bg-transparent" aria-label="Color" />
              <Button variant="outline" size="icon" aria-label="Rotate" onClick={() => patch(selected.id, { rot: ((selected.rot + 90) % 360) as PlacedItem["rot"] })}><RotateCw className="size-4" /></Button>
              <Button variant="outline" size="icon" aria-label="Remove" onClick={() => { setItems((s) => s.filter((i) => i.id !== selected.id)); setSelectedId(null); }}><Trash2 className="size-4" /></Button>
            </div>
          )}
        </main>

        <aside className="w-64 shrink-0 overflow-y-auto border-l border-border p-5">
          <h2 className="eyebrow mb-3">Add furniture</h2>
          <div className="grid grid-cols-2 gap-2">
            {CATALOG.map((c) => (
              <button key={c.type} onClick={() => add(c)} className="catalog-tile">
                <span className="size-6 rounded-full" style={{ background: c.color }} />
                <span className="text-sm font-medium">{c.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{c.w}×{c.d} m</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Drag pieces on the floor. Click one to rotate, recolor or remove it.</p>
        </aside>
      </div>
    </div>
  );
}
