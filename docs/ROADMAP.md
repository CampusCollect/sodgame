# Step-by-Step Execution Roadmap

This roadmap decomposes the mega-spec for the 2D zombie survival sandbox into incremental, Git-friendly work packages. Each package is designed to be completed via short-lived feature branches and reviewed pull requests, following the "plan → implement → self-test → harden → log" loop described in the specification.

## MLP Readiness (Current Gap Analysis)
The world now streams deterministically, inventories/crafting/base-building loops are interactive, and POIs spawn modular loot scenes. To ship a **minimum lovable product** on the current finite world map, the following work items must land:

| Area | Status | Delta to MLP |
| --- | --- | --- |
| **Persistence & saves** | ❌ Not started | Serialize player/base/chunk deltas so progress survives restarts; add migration scaffolding. |
| **Combat-ready zombies & AI** | ⚠️ FSM scaffolded | Implement attacks, damage resolution, memory decay, and horde sieges tied to base heat. |
| **Vehicle physics & convoys** | ⚠️ Player-only driving | Add collisions, damage, fuel, and convoy escorts that physically travel the road graph for ambush gameplay. |
| **Facilities & survivor jobs** | ⚠️ UI stubbed | Connect jobs to facility throughput, add build timers/power costs, and surface morale events tied to gameplay. |
| **POI interiors & encounters** | ✅ Loot scenes online | Expand templates with barricades, alarms, and faction ownership; spawn zombies/containers per POI. |
| **Economy & sieges** | ⚠️ Heuristic | Replace proxy heat metrics with true stockpile values, trigger sieges + trader pricing off that data. |

Once those rows are green the build will support the full loop (spawn → scavenge → craft → recruit → raid → defend) even before we swap the finite map for the endless worldgen variant.

## Phase 0 – Foundations & Tooling
1. **Repository Scaffolding**
   - Convert the monolithic `main` HTML file into a structured project (`src/`, `assets/`, `data/`, `docs/`).
   - Introduce a lightweight build pipeline (Vite or Parcel) so modules can be authored with ES modules/TypeScript.
   - Add linting (`eslint`), formatting (`prettier`), and unit test harness (Vitest) to enforce code quality.
   - ✅ 2024-05-09: Migrated to Vite + TypeScript bootstrap with modular directories.
2. **Documentation Baseline**
   - Create `README.md`, `ARCHITECTURE.md`, `RESEARCH.md`, `WORKLOG.md`, `TESTING.md`, and `LIMITATIONS.md` skeletons.
   - Capture initial assumptions and open questions under `ASSUMPTION:` headings.
   - Set up contribution guide describing branch naming, PR template, and testing expectations.
3. **Data Directory & Schema Contracts**
   - Establish JSON schema definitions for items, recipes, zombies, vehicles, factions, etc.
   - Provide validation scripts so malformed data fails fast.

## Phase 1 – World & Player Core Loop
1. **World Generation Module**
   - Implement chunk streaming, biome assignment, and POI seeding per the spec.
   - Persist chunk deltas and ensure deterministic generation via shared seeds.
2. **Player Controller & Survival Stats**
   - Port player movement, input handling, and HUD from the prototype into modular systems.
   - Hook up health, hunger, thirst, stamina, and morale decay/regeneration.
3. **Basic Zombie AI (Idle → Aggro)**
   - Reimplement the FSM with modular state classes, noise inputs, and debug overlays.
   - Validate sight/hearing ranges with automated tests that emit synthetic events.
4. **Save/Load Infrastructure**
   - Implement serialization for player state, chunks, and loose items to JSON save slots.

## Phase 2 – Inventory, Crafting, and Items
1. **Inventory Grid System**
   - Replace the prototype inventory with a data-driven grid supporting rotation, stacking, and nested containers.
   - Build reusable UI components (drag targets, context menus) in a dedicated module.
2. **Item Metadata & Durability**
   - Align item definitions with schemas; implement durability decay hooks for weapons, food freshness timers, and attachment slots.
3. **Crafting Workstations**
   - Stand up crafting queues, station requirements, skill checks, and failure cases.
   - Integrate with inventory to consume/produce items correctly.

## Phase 3 – Vehicles & Logistics
1. **Vehicle Controller Abstraction**
   - Separate vehicle physics, damage, and fuel consumption into reusable classes.
   - Provide AI hooks for NPC drivers and convoys.
2. **Trailer & Cargo Manifest System**
   - Implement hitching/detaching, trailer physics joints, and transparent cargo HUD.
   - Support nested vehicle storage and weight-based handling modifiers.
3. **Maintenance & Upgrades**
   - Build garage UI for repairs, upgrades, and part management; tie into crafting recipes.

## Phase 4 – Base Building & Survivors
1. **Construction & Power Grid**
   - Introduce placement gizmos, snapping, and material costs; ensure power line logic respects load/priority rules.
2. **Facilities & Jobs**
   - Implement facility tiers, upgrade timers, and survivor job assignments with scheduling.
3. **Survivor Simulation**
   - Flesh out skills, traits, morale swings, relationship graph, and event system (arguments, celebrations, memorials).

## Phase 5 – Factions, Raids, and Progression
1. **Faction Reputation & Trading**
   - Track reputation deltas, gate trader inventories, and add barter UI.
2. **Convoy & Raid Loop**
   - Schedule convoys on road graph, deliver intel notifications, and script ambush encounters.
3. **Difficulty Scaling & Heat**
   - Tie region rings, heat, and seasonal modifiers into spawn tables and siege pacing.

## Phase 6 – Polish & Compliance
1. **Accessibility & UX**
   - Keyboard navigation, colorblind-safe palettes, tooltips, and tutorials.
2. **Performance Pass**
   - Profile chunk streaming, AI updates, and rendering; optimize with batching and culling.
3. **QA Automation**
   - Expand integration tests, record demo scripts, and ensure CI covers lint/test/build.

## Operational Guidelines
- Every task must update `WORKLOG.md` with decisions and `ASSUMPTION:` markers.
- No code merges without updated tests/docs.
- Maintain the risk register in `LIMITATIONS.md` and review it during each milestone retro.

This roadmap is intentionally incremental to ensure continuous integration and review, making the daunting specification approachable via disciplined execution.
