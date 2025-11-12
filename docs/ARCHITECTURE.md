# Architecture Overview

## Runtime Layers
- **Engine Loop** (`src/engine/`) – manages update/draw cadence, input, and cross-system wiring.
- **Content Layer** (`src/data/`) – loads JSON-driven definitions for items, vehicles, zombies, and facilities via `ContentRegistry`.
- **Simulation Systems** (`src/worldgen`, `src/ai`, `src/vehicles`, `src/building`, etc.) – encapsulate domain logic with minimal DOM knowledge.
- **Interface Layer** (`src/ui`, `src/inventory`) – renders overlays, HUD, and interacts with simulation state via controllers and transparent HUD components.

## Current Modules
- `World` – deterministic chunk generation stub with biome rings.
- `ContentRegistry` – imports all JSON configs and exposes typed snapshots for systems.
- `InventoryController` + `TransparentContainerHUD` – DOM overlays reflecting grid inventories and nested containers.
- `ZombieDirector` – coordinates FSM zombies, noise propagation, and horde scaffolding for debug visualization.
- `VehicleDirector` – instantiates vehicles/trailers from data definitions with hitch + cargo manifest scaffolds.
- `TransparentCargoHUD` & `MaintenanceUI` – UI overlays for trailer cargo manifests and vehicle condition readouts.

Each system now consumes shared data definitions, enabling iteration on balance via JSON instead of code edits. Subsequent milestones will replace stubs with full mechanics while respecting the same module boundaries.
