# WORKLOG

## 2024-05-11 – Inventory Grid Upgrade
- Replaced the placeholder slot list with a grid-aware inventory model that respects item sizes, rotation, and weight caps.
- Implemented shared rendering helpers so player and transparent container HUDs now visualize multi-cell items accurately.
- Added lightweight weight-tracking UI; soft limitation: partial acceptance when overweight is deferred (`ASSUMPTION: weight overfill currently blocks the full stack rather than splitting`).

## 2024-11-12 – Roadmap Initialization
- Documented a phased execution roadmap that slices the mega-spec into Git-friendly milestones.
- Highlighted the Build-Then-Verify loop expectations within each phase to ensure disciplined delivery.
- Assumption clarified: existing single-file prototype will be modularized during Phase 0 before large-scale feature work.

## 2024-05-09
- Replaced the single-file HTML prototype with a Vite + TypeScript canvas runtime.
- Stubbed world generation, inventory overlay, zombie and vehicle directors to anchor future systems.
- Established baseline HUD/inventory UI with modular styling.
- Encountered npm registry 403 when installing dependencies from container; documented as environment limitation for CI planning.

## 2024-05-10 – Research Consolidation & Data Pass
- Completed mandated research summaries for all eleven core systems; linked documents under `docs/research/`.
- Added data schema scaffolds (items, vehicles, zombies, etc.) and TypeScript loaders to prepare for data-driven systems.
- Stubbed new simulation modules (FSM, cargo manifest, noise bus) and UI overlays to align with mega-spec deliverables.
- ASSUMPTION: Initial data sets are representative samples rather than full 50+ item catalogs; expand alongside implementation sprints.
