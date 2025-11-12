# Architecture Overview

## Runtime Layers
- **Engine Loop** (`src/engine/`) – manages update/draw cadence, input, and cross-system wiring.
- **Simulation Systems** (`src/worldgen`, `src/ai`, `src/vehicles`, etc.) – encapsulate domain logic with minimal DOM knowledge.
- **Interface Layer** (`src/ui`, `src/inventory`) – renders overlays, HUD, and interacts with simulation state via controllers.

## Current Modules
- `World` – deterministic chunk generation stub with biome rings.
- `Player` – camera-centered actor with movement + inventory reference.
- `InventoryController` – DOM-driven overlay toggled via `InputManager`.
- `ZombieDirector`/`VehicleDirector` – lightweight stand-ins for future AI logistics.

This document will evolve as systems gain depth, including component diagrams and data flow once the data-driven configs land.
