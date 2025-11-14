# Architecture Overview

## Runtime Layers
- **Engine Loop** (`src/engine/`) – manages update/draw cadence, input, and cross-system wiring.
- **Content Layer** (`src/data/`) – loads JSON-driven definitions for items, vehicles, zombies, and facilities via `ContentRegistry`.
- **Simulation Systems** (`src/worldgen`, `src/ai`, `src/vehicles`, `src/building`, etc.) – encapsulate domain logic with minimal DOM knowledge.
- **Interface Layer** (`src/ui`, `src/inventory`) – renders overlays, HUD, and interacts with simulation state via controllers and transparent HUD components.

## Current Modules
- `World` + `BiomeManager` + `POIManager` + `RoadNetwork` – lazy-loads deterministic chunks, assigns biomes via weighted distance/noise, scatters POIs per biome/category, and links major POIs with spline-like roads while maintaining active vs. cached chunk radii.
- `ContentRegistry` – imports all JSON configs and exposes typed snapshots for systems.
- `InventoryController` + `TransparentContainerHUD` – DOM overlays reflecting grid inventories and nested containers.
- `CraftingController` + `CraftingPanel` – recipe book, skill-checked queue management, and DOM planner overlay backed by JSON definitions.
- `BuildingManager` + `BuildingController` – base building planner with collision checks, power balancing, and inventory-backed placement costs rendered in-canvas.
- `ZombieDirector` – coordinates FSM zombies, noise propagation, and horde scaffolding for debug visualization.
- `VehicleDirector` – instantiates vehicles/trailers from data definitions, handles enter/exit prompts, simplified driving physics, hitch offsets, and keeps the cargo manifest + hint overlays in sync with player input.
- `TransparentCargoHUD` & `MaintenanceUI` – UI overlays for trailer cargo manifests (grid + weight readouts via **V**) and vehicle condition readouts.
- `LootGenerator` + `WorldContainerManager` – rolls JSON loot tables into world containers, shows transparent HUD overlays, and manages respawn timers plus **E**-key loot actions.
- `SurvivorManager` + `SurvivorController` + `SurvivorPanel` – maintains roster morale/relationships, job assignments, and exposes them via an accessible DOM dialog (`J`).
- `FactionManager` + `ConvoyScheduler` + `RaidPlanner` + `RaidPlanningUI` – tracks reputation per faction, runs ticking convoy schedules, and drives the raid/convoy planner overlay triggered with `R`.
- `StealthController` + `NoiseBus` + `VisibilitySystem` – aggregates noise events for all systems, computes ambient light/visibility, feeds HUD meters, and surfaces alarm states plus distraction tools bound to `Z/X`.
- `CombatController` – centralizes firearm + melee definitions, tracks magazine state/reload timers, spawns projectiles, emits stealth-aware noise events, and feeds the HUD weapon line with ammo/reserve/reload state while exposing disassembly hooks.
- `PlayerVitals` – tracks player HP/stamina/bleed/infection, listens for the **H** quick-heal binding (consuming bandages/medkits), serializes into the save system, and feeds the HUD vitals card while letting `ZombieDirector` apply melee damage.
- `ProgressionController` + `DifficultyScaler` + `BaseHeatTracker` + `SeasonManager` – consume the JSON progression curve, compute region rings/difficulty based on player distance + community power, retune zombie spawn mixes, track base heat and siege thresholds, and render the HUD/side panel with season effects.

Each system now consumes shared data definitions, enabling iteration on balance via JSON instead of code edits. Subsequent milestones will replace stubs with full mechanics while respecting the same module boundaries.
