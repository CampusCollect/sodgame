# outbroken – Modular Reboot (Ubisoft x unturned x state of decay)

This repository now ships a clean-room TypeScript/Vite foundation for the large-scale 2D survival sandbox. The previous monolithic HTML dump has been replaced by a modular runtime with clear seams for each system (world gen, inventory, AI, vehicles, etc.).

## Getting Started

```bash
npm install # optional when registry access is available
npm run dev
```

> **Note:** The execution environment used for this milestone cannot reach the public npm registry (403). The repository already vendors a populated `node_modules` folder so `npm run dev`/`npm run build` continue to work; mirror the packages internally if you need a clean install.

The development server will auto-open the canvas demo. Use **WASD** to move, **Shift** to sprint, **Ctrl** to crouch, **Tab** to toggle the inventory overlay, **C** to open the crafting planner, **B** for the base building planner, **J** to open the survivor roster and job board, **R** to launch the raid/convoy planner, **Z/X** to cycle/use stealth tools, **E** to interact with containers **and** enter/exit vehicles, and **V** to open or close the transparent trailer cargo HUD when you are near a trailer or seated in a tractor.

## Tech Stack

- [Vite](https://vitejs.dev) + TypeScript for hot-reload iteration.
- Modular directories under `src/` mirroring the mega-spec system boundaries (e.g. `worldgen`, `inventory`, `vehicles`).
- DOM overlays for HUD/inventory paired with canvas rendering for the simulation layer.
- JSON-driven content registry (`data/`) powering items, vehicles, zombies, facilities, and progression curves.

## Current Highlights

- Grid-aware backpack inventory with rotation, stack merging, and live weight tracking shared across the player UI and transparent container HUDs.
- Interactive crafting planner with station tabs, recipe requirements, skill gating, and live queue progress backed by the JSON recipe set.
- Base building planner with live power tracking, placement previews, and collision-aware structure placement that consumes inventory resources.
- Survivor management pass with morale tracking, relationship adjustments, and a job assignment board surfaced through the new **J** panel.
- Faction reputation + convoy raid planner (**R**) that surfaces intel windows, allows ambush simulations, and logs the resulting loot/reputation swings.
- Looted world containers seeded around the starting area that use the transparent HUD, **E**-key interaction, and the new loot generator to stream weighted drops with respawn timers.
- Stealth controller with a shared noise bus, ambient light/detection model, alarm scaffolding, and HUD widgets (noise meter + light badge) plus distraction tools mapped to **Z/X**.
- Driveable vehicles with enter/exit prompts, simplified acceleration/turning, and a transparent trailer cargo HUD (**V**) that visualises the manifest grid/weight usage for the semi demo setup.

## Next Steps

- Flesh out the remaining director stubs (zombies, vehicles) with full combat/AI, collisions, and convoy routing.
- Port the research-backed mechanics into their dedicated modules.
- Expand automated testing with Vitest as systems mature.
- Wire survivor job output into facilities, sieges, and crafting speed bonuses.

See [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/WORKLOG.md](docs/WORKLOG.md) for milestone planning and day-to-day execution notes.
