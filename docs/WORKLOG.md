# WORKLOG

# 2024-05-21 – POI Templates, Loot Scenes, and MLP Plan
- Authored `data/poi_templates.json` plus new world container definitions so every generated POI now instantiates a deterministic loot scene (fridges, lockers, duffles, crates) when the player approaches.
- Reworked `WorldContainerManager` to sync with streamed chunks instead of demo coordinates, driving container respawns from each POI’s loot timer and cleaning up scenes when the player leaves the area.
- Added an "MLP readiness" matrix to `docs/ROADMAP.md`, refreshed README highlights, and logged the outstanding blockers between the current finite map and a playable loop.
- ASSUMPTION: For testing, one in-game day currently equals **60 real-time seconds** when translating POI `respawn_days` ranges into container respawn timers; revisit once the global time system lands.

# 2024-05-20 – Chunk Streaming, POIs, and Roads
- Introduced JSON-backed biome + POI catalogs (`data/biomes.json`, `data/poi_spawns.json`) and extended `ContentRegistry` so world generation can stay data-driven.
- Rebuilt `World` around `BiomeManager`, `POIManager`, and `RoadNetwork` to stream chunks lazily, keep a 3/5 chunk active/cache radius, and surface transparent POI overlays plus spline roads tying major POIs together.
- Added deterministic POI scattering with overlap rejection, biome-weighted spawn chances, and a visual HUD label so QA can confirm loot/alarms per location.
- ASSUMPTION: POIs currently render only as overlays; their interior tiles/containers will spawn in the dedicated POI pass.

# 2024-05-19 – Progression, Base Heat, and Seasons
- Implemented `ProgressionController` with difficulty scaler, base heat tracker, and season manager so distance + community stats retune zombie counts, update HUD meta text, and show a dedicated progression card.
- Hooked the new controller into the engine loop plus zombies/HUD, added survivor/base metrics needed for the calculations, and layered in CSS for the always-on progression card.
- Documented the heuristics (backpack weight ≈ loot value, structure HP ≈ defense) along with testing steps, risks, and future integration notes.
- ASSUMPTION: 10 real-time minutes map to one in-game day for seasonal rotation until the proper time/weather system lands.

# 2024-05-18 – Vehicle Driving & Cargo HUD
- Expanded `VehicleDirector` so the player can enter/exit demo vehicles with **E**, drive them with simplified acceleration/turning, and receive contextual hints via a DOM badge.
- Wired the transparent cargo HUD (**V**) into the new `CargoManifest` grid renderer so the semi trailer surfaces stored vehicles/crates with live kg totals.
- Added player movement locking, cargo manifest packing, HUD styles, and documentation/test updates covering the new controls and QA steps.
- ASSUMPTION: Vehicles still ignore collisions/damage/fuel—documented in limitations until the physics pass.

# 2024-05-17 – Stealth Controller, Noise HUD, and Tools
- Moved the shared noise propagation layer into the stealth module, layered on visibility + alarm controllers, and exposed the bus to zombies so every system reacts to the same events.
- Added sprint/crouch stances, distraction tools (cycle with **Z**, deploy with **X**), and DOM HUD widgets (noise meter + light indicator) so QA can validate stealth feedback loops without debug overlays.
- Documented the new bindings, smoke tests, data files, and updated risks (alarms don’t yet drive reinforcements) across README/architecture/testing/limitations.
- ASSUMPTION: Alarm triggers currently surface UI state only—faction AI responses will hook in during the combat milestone.

# 2024-05-16 – Loot Containers & Generator
- Implemented `LootGenerator` + `WorldContainerManager` so weighted drops populate world crates, surface through the transparent HUD, and support **E/Loot All** transfers with respawn timers.
- Extended the HUD tooltip, transparent container UI, and styles with action buttons + hints so QA can see contextual controls without console hacks.
- Added an `interact` binding to the input layer and documented the new smoke test, risks, and keybinding updates across README/testing/limitations.
- ASSUMPTION: Looted crates spawn at fixed demo coordinates for now; chunk-aware distribution + lockpicking come in the worldgen/stealth milestone.

# 2024-05-15 – Faction Reputation & Convoy Planner
- Added a data-backed faction manager plus convoy scheduler that ticks in real time, revealing intel windows and handling ambush cooldowns.
- Wired a new raid planner overlay (`R`) that exposes faction standings, convoy cargo/ETA, and lets QA trigger simulated ambushes with log output.
- Documented keybindings + architecture updates and noted that combat resolution remains simulated (loot + reputation deltas only).
- ASSUMPTION: Convoy ambushes resolve abstractly for now—future passes will instantiate world encounters and vehicle combat.

# 2024-05-14 – Survivor Roster, Morale, and Jobs
- Introduced a survivor controller (`J` shortcut) that surfaces the roster, morale trends, and quick morale events for QA.
- Implemented morale decay/events, relationship deltas, and job assignments wired through the JSON survivor catalog.
- Added data sets for skills, traits, and starting survivors so subsequent systems can reason about community composition.
- ASSUMPTION: Job assignments currently track intent only; facility production modifiers will hook in during the facility sprint.

# 2024-05-13 – Base Building Planner & Power Pass
- Introduced a base building controller (`B` shortcut) with collision-aware placement previews, live power accounting, and
inventory-backed material consumption.
- Added a diesel generator and powered gate definitions to the data set, wiring power output/consumption into the placement
flow.
- Surfaced placement feedback in-canvas (ghost outlines) and within the planner UI so testers can see readiness, material gaps,
and power deficits in real time.
- ASSUMPTION: Construction time is abstracted for this milestone; structures place instantly and job assignments will hook in
later.

## 2024-05-12 – Crafting Queue + Planner
- Introduced a JSON-driven crafting controller with recipe book, skill checks, and per-station queues feeding back into the player inventory.
- Added a DOM crafting planner (key `C`) that surfaces recipe requirements, blueprint locks, and queue progress with inline error feedback.
- Extended the inventory core with quantity checks/consumption hooks to support crafting inputs without duplicating grid logic.

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
