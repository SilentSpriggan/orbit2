# Anatomy model assets

Served locally by FastAPI (or Vite in development). Nothing here is loaded from a CDN.

- `body.glb` — the reference body. **Not committed.** Mesh (or parent node) names must match the `meshNames` in `src/modules/anatomy/mocks/regions.json` (for example `femur_left`, `kidney_right`). If the file is missing or fails to load, the Anatomy lab falls back to the 2D map and shows a badge.
- `ATTRIBUTION.json` — `{ "text", "license", "url" }` shown in the viewer's bottom bar. Update it to match the shipped model's license.
- `draco/` — Draco decoders copied from `three/examples/jsm/libs/draco/gltf/`. Meshopt decoding is bundled into the app.

Set `VITE_ANATOMY_PLACEHOLDER=true` to use the procedural placeholder body instead of `body.glb`.
