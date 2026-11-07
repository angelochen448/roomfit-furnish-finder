# Room-photo warning fixes
- [x] Handle furnished portrait and overhead photos without misleading failure alerts; preserve occupied-area blocking.
- [x] Verified both supplied photos at 639 × 770 with no runtime errors; overhead resolves six occupied areas, portrait resolves nine with one genuinely hidden lamp location remaining review-blocked. All 16 room regression tests passed.

# AI room analysis
- [x] Detect floor perspective and existing furniture from a room photo; allow review, cancellation and manual alignment, with partial rear-edge alignment when near corners are missing.
- [x] Block additions, dragging and rotations in detected occupied floor areas; invalidate detections on photo replacement.
- [x] Verified real furnished photo (six items), blocked drag, sample-room rear-edge alignment, desktop/mobile and replacement clearing; 20 regression tests passed. Full-floor perspective fit is unit-tested; both reference photos correctly used partial alignment rather than inventing hidden corners.

# Draggable grid
- [x] Add touch/mouse grid alignment alongside existing sliders, keeping furniture aligned and reset available.
- [x] Verify desktop mouse/mobile touch alignment, reset and furniture rotation; 65 room/geometry regression tests passed.

# Optional measurement diagrams
- [x] Add manual overall dimensions before matching and preserve edits after analysis.
- [x] Allow photo-only matching; verified real desk import and placement at manually edited 160 × 80 × 79 cm on desktop/mobile; 27 tests passed.

# Part-based rigid furniture
- [x] Extract and validate reusable positioned parts from photos, preserving seating and confirmed dimensions.
- [x] Render endpoint-based supports and surfaces, with comparison preview and honest limitations.
- [x] Verify supplied A-frame desk via real photo analysis, 83 geometry/measurement tests including contrasting pedestal assembly, and desktop/mobile preview and room placement (160 × 80 cm, manually selected 78 cm adjustable height).

# Furniture category approximations
- [x] Extend photo classification and optional traits for chairs, stools, tables, desks and beds; retain existing sofas and armchairs.
- [x] Add normalized procedural shapes and catalog entries without changing photo-only inputs or room controls.
- [x] Test dimensions and contrasting shapes (87 tests); verify actual photo import at 80 × 84 × 75 cm and all six categories placed/rotated on desktop, plus mobile rendering.

# Photo-only inputs
- [x] Remove product-link modes and optional name input; preserve measurement review.
- [x] Surface the user's room-photo upload alongside furniture photos and verify uploads on desktop/mobile; 62 regression tests passed.

# Furniture-link import
- [x] Connect product-page reading service.
- [x] Import IKEA product names and assembled dimensions from a pasted link.
- [x] Confirm dimensions and place an approximate storage/furniture model in the room.
- [x] Test the supplied BESTÅ link end to end.

# Measurement-photo import
- [x] Upload measurement photos and extract explicit overall dimensions.
- [x] Review dimensions and place an approximate furniture model.
- [x] Verify photo analysis and placement end to end (IKEA chair diagram: 80 × 84 × 75 cm).

# Product likeness
- [x] Combine optional IKEA link, product photos and measurement diagrams in one import.
- [x] Extract appearance details and render rounded, product-specific seating approximations at confirmed dimensions.
- [x] Verify real product photos, measurements and placement together (orange armless IKEA chair, 80 × 84 × 75 cm).

# Sofa dimensional accuracy
- [x] Make all sofa parts scale proportionally and normalize actual geometry bounds to confirmed dimensions.
- [x] Measure complete and individual mesh bounds across four dimensions and four appearances (16 geometry tests); verify rendering and rotation in the room.

# Imported seating silhouette
- [x] Extend photo appearance parameters without changing measurement extraction or import UI.
- [x] Improve arms, cushions, backs, chaise bases and legs; normalize imported armchairs too.
- [x] Verify classic rolled/tufted and modern chaise sofa rendering, 24 sofa bounds cases, imported armchair bounds, and real IKEA chair photo import (80 × 84 × 75 cm); 46 tests passed.

# Furniture realism
- [x] Expand validated photo traits and targeted seating/structural geometry without changing the import UI or dimensions.
- [x] Improve contact shadows and material lighting without changing camera or dragging.
- [x] Verify described charcoal bench sofa and contrasting seating, other categories, exact bounds, and real photo import/control regressions (72 tests, screenshots, real IKEA photo import at 80 × 84 × 75 cm).
- [ ] Compare against the actual gray-sofa photograph — blocked: no sofa reference image was attached; only the written description and an older GitHub screenshot are available.