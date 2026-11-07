<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Room studio
- Keep room geometry and fit rules in the browser-safe room module, with Three.js rendering in the room components; this keeps placement logic testable independently of WebGL.
- Treat photo alignment as manual camera calibration, not automatic room reconstruction; a single uploaded photo does not supply measured 3D geometry.
- Import English IKEA product links through a server function using Firecrawl; parse assembled measurements separately from packaging and require review before placement so product dimensions are never invented.
- Missing overall measurements must remain blank and block placement until entered; never substitute seat dimensions, unfolded-bed dimensions, or package dimensions for the chair footprint.
- Imported furniture uses explicitly labeled approximate procedural geometry rather than claiming manufacturer-exact models; keep extracted dimensions as the placement and fit-check source of truth.
- Read measurement photos through a server-only vision helper with a browser-safe evidence validator; only explicit overall dimensions may populate placement inputs, so unreadable or seat/bed/package measurements remain missing.
- Keep photo-derived seating appearance as normalized visual proportions carried with placed items; render rounded seating from those proportions within confirmed dimensions, never use inferred proportions as fit measurements.
- Normalize sofa and appearance-driven armchair mesh bounds in local coordinates after geometry layout to confirmed dimensions and floor origin; this keeps actual rendered extents equal to fit dimensions regardless of appearance or room transforms.
- Keep optional silhouette details backward-compatible with existing appearance records; photo-derived arm widths, cushion counts, back slopes and leg shapes are visual parameters, never measurement evidence.
- Carry optional seating material/component traits and non-seating structural fractions through the existing catalog/placed-item records; defaults preserve older imports and confirmed dimensions always remain authoritative.
- Use deterministic local upholstery microtextures and a low-resolution live contact-shadow pass; avoid external asset dependencies and keep shadows responsive to dragging.
- Render photo-derived chair, stool, table, desk and bed traits through normalized ShapeFurniture geometry inside DimensionedFurniture; this extends category coverage without changing placement or authoritative dimensions.
- Prefer validated photo-described primitive assemblies for imported rigid furniture, using endpoint beams and DimensionedFurniture; retain legacy defaults and seating, and block explicitly unsupported assemblies to avoid misleading substitutes.
