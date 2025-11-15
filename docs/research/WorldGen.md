# World Generation Research

## References
- **Minecraft** – chunk streaming, deterministic seeds, biome blending using noise overlays.
- **Terraria** – tile-based worlds saved per chunk row with procedural POIs.
- **No Man's Sky** – galaxy-scale procedural seeds that guarantee persistence across sessions.
- **Assorted Road-Tech Papers** – Voronoi partitions for biome assignment, Delaunay + spline generation for roads.

## Findings
- Minecraft shows the viability of 16×16 (or derivative) chunks with seed-derived variation; caches around the player prevent pop-in.
- Terraria stores tile/material metadata in compact chunks and applies structure passes after terrain creation to embed POIs.
- No Man's Sky demonstrates hashing world seed + coordinates to produce infinite deterministic content without storing everything.
- Procedural road networks benefit from first building a POI graph (Delaunay) and then smoothing edges into splines, similar to studies on procedural city generation.

## Patterns Observed
- **Streaming**: keep an active radius and a larger cached radius, evicting least-recently-used chunks.
- **Biome Assignment**: Voronoi or Lloyd-relaxed cells with per-biome noise thresholds blend textures and spawn tables.
- **POI Placement**: Weighted scatter that respects minimum distance constraints; Minecraft's structure placement pipeline is a proven model.
- **Serialization**: Per-chunk deltas stored separately from static procedural definition keeps save files small.

## Implementation Plan
1. Create `ChunkManager` that derives seeds from `worldSeed ^ hash(chunkX, chunkY)` and owns load/unload bookkeeping.
2. Generate biome map using Voronoi over a coarse grid, sampling noise along edges for blending masks.
3. Maintain a POI registry keyed by biome + rarity; a rejection sampling pass per chunk populates residential/commercial/industrial sets.
4. Persist player-built structures and container states as JSON overlays saved per chunk with schema version metadata.
5. Road system: build POI graph, run Delaunay triangulation, then convert edges to cubic Bezier splines with lane metadata.

## Assumptions
- Tile resolution will settle on 1m, so 128×128 tiles (~128m square) per chunk matches traversal pacing.
- Saving JSON per chunk is acceptable for early milestones; binary compression can follow if IO becomes a bottleneck.
- We will lazily compute biome audio cues using the same Voronoi weights rather than a separate system initially.

## Implementation Notes – 2024-05-20
- `BiomeManager` now approximates the Voronoi requirement using weighted radial preferences blended with deterministic noise so biomes transition gradually as in Minecraft/Terraria hybrids.
- `POIManager` consumes the new JSON catalogs and runs a rejection sampling pass per chunk, mirroring Terraria's structure phase to prevent overlapping POIs and respecting biome-specific spawn weights.
- `RoadNetwork` builds a Delaunay-lite graph by connecting each major POI to its three nearest neighbors, then renders quadratic curves to suggest multi-lane highways inspired by MGSV/Far Cry road graphs.
- Streaming respects the 3-chunk active / 5-chunk cache radii, enabling Minecraft-style pop-in suppression and preparing us for chunk-level serialization work next.
