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