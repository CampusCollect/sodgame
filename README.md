# State of Decay Sandbox – Modular Reboot

This repository now ships a clean-room TypeScript/Vite foundation for the large-scale 2D survival sandbox. The previous monolithic HTML dump has been replaced by a modular runtime with clear seams for each system (world gen, inventory, AI, vehicles, etc.).

## Getting Started

```bash
npm install # optional when registry access is available
npm run dev
```

> **Note:** The execution environment used for this milestone cannot reach the public npm registry (403). The repository already vendors a populated `node_modules` folder so `npm run dev`/`npm run build` continue to work; mirror the packages internally if you need a clean install.

The development server will auto-open the canvas demo. Use **WASD** to move, **Shift** to sprint, **Ctrl** to crouch, and tap **Tab** once to open the unified overlay: every management system (Inventory, Crafting, Build Planner, Facilities, Survivors, Raids, Weapon Mods, Maintenance, and the new Map intel panel) now lives on tabbed pages inside the same semi-transparent shell. Hotkeys still jump directly to a tab (**C** crafting, **B** building, **N** facilities, **J** survivors, **R** raids, **T** weapon mods, **M** vehicle maintenance, **P** map), and you can also click between tabs without re-closing the overlay. **Z/X** cycle/use stealth tools, **E** handles interaction/enter-exit vehicles, and **V** opens the transparent trailer cargo HUD when you are near a trailer or seated in a tractor. Hold **E** on loot containers to search (or force open a locked stash), tap **L** with a Lockpick Kit for a quiet pick, and right-click ammo stacks in the grid to reload the equipped firearm. Combat bindings: **Mouse1** fires toward the cursor, **Q** swings the current melee weapon, **F** reloads, **1** cycles through carried weapons, **g** throws the selected grenade while **G** cycles grenade types, and **H** consumes a bandage or medkit for a quick heal. Tap **Y** near a vehicle to pour a fuel can into the tank. Press **F5** at any time to quick-save and **F9** to reload the latest session snapshot – text inputs (raid search, survivor notes, facility filters) suppress global hotkeys so UI workflows remain stable while typing.

## Tech Stack

- [Vite](https://vitejs.dev) + TypeScript for hot-reload iteration.
- Modular directories under `src/` mirroring the mega-spec system boundaries (e.g. `worldgen`, `inventory`, `vehicles`).
- DOM overlays for HUD/inventory paired with canvas rendering for the simulation layer.
- JSON-driven content registry (`data/`) powering items, vehicles, zombies, facilities, and progression curves.

## Current Highlights

- Grid-aware backpack inventory with rotation, stack merging, live weight tracking, and automatic weight-aware stack splitting so overweight pickups stay in the source container instead of failing outright. Equippable packs/vests/armor/helmets now resize the grid, raise weight limits, and expose their armor rating both in the inventory panel and on the HUD.
- Unified overlay UI with tabbed panels (Inventory, Crafting, Build, Facilities, Survivors, Raids, Weapon Mods, Maintenance, and Map intel) so every management system shares a single semi-transparent shell instead of scattering fixed HUD windows.
- HUD weapon tracker now mirrors Unturned/SoD expectations: the active weapon block shows mag/reserve/reload/grenade state, while slot cards render the top three weapons with icons and ammo counts for quick swaps.
- Streaming chunked world backed by JSON biomes/POIs with Voronoi-inspired biome assignment, transparent POI callouts, and spline-like road overlays that stay deterministic as you roam.
- Interactive crafting planner with station tabs, recipe requirements, skill gating, and queue progress that now stalls/labels crafts when output storage is full instead of deleting the results.
- Base building planner with live power tracking, placement previews, and collision-aware structure placement that consumes inventory resources.
- Survivor management pass with morale tracking, relationship adjustments, and a job assignment board surfaced through the new **J** panel.
- Faction reputation + convoy raid planner (**R**) that now supports faction filters, search, and per-convoy tracking so intel clicks always react with helpful status/tooltip messaging before you ambush.
- Looted world containers seeded around the starting area that use the transparent HUD, **E**-key interaction, and the new loot generator to stream weighted drops with respawn timers. Commercial/military/special POIs now pull from distinct T2–T5 tables so advanced gear (Vector SMGs, MK14/Magnetic rifles, Ranger packs, composite armor, blueprints) appears where expected.
- Container interaction pass that adds hold-to-search flows, lockpick support (**L**), and loud forced-entry noise events that tie back into the stealth bus so lockers feel meaningful instead of instant-free loot.
- POI template scenes that attach interactive loot containers to each generated site so scavenging now happens inside residential blocks, malls, yards, and checkpoints instead of fixed demo crates.
- Stealth controller with a shared noise bus, ambient light/detection model, alarm scaffolding, and HUD widgets (noise meter + light badge) plus distraction tools mapped to **Z/X**.
- Driveable vehicles with fuel burn, condition wear, refueling (**Y**) from fuel cans, a maintenance overlay (**M**) that surfaces fuel/engine/cargo health, enter/exit prompts, simplified acceleration/turning, and a transparent trailer cargo HUD (**V**) that visualises the manifest grid/weight usage for the semi demo setup.
- Convoy ambushes now push their loot directly into your backpack (with spillover reward crates spawning next to the player if you are overweight) so intel-planning flows finally culminate in tangible loot runs.
- Progression controller that scales rings by distance, visualises base heat + siege warnings, rotates seasonal modifiers, and retunes zombie populations + loot tiers automatically.
- Single-slot quick-save/quick-load loop (**F5/F9**) that serializes the player inventory, placed structures, POI loot scenes, and progression state so QA can hop between builds without losing progress.
- Weapon/combat layer with JSON-defined firearms/melee stats, projectile simulation, ammo + reload management, melee arcs, attachment-aware stat tweaks, grenade throwing/cycling, stealth-aware muzzle noise, and HUD readouts for ammo/reserve/reload progress.
- Player vitals + zombie melee damage pass that tracks HP/stamina/bleed/infection, feeds the new HUD vitals card, lets zombies chip the player down in melee, and exposes an **H** quick-heal action that burns bandages/medkits.
- Player movement locking is now source-aware (vehicles, weapon mods, downed state, etc.) so overlays can no longer leave the character frozen; each subsystem releases only its own lock and a fresh load clears stragglers automatically.
- Facility + stockpile management (**N**) that lets you queue hydro farms/workshops/infirmaries, tracks power draw and survivor staffing, auto-produces food/meds/parts into a persistent base stockpile, and surfaces totals on the HUD/progression heat model.

## Next Steps

- Close the gaps called out in the new "MLP readiness" table inside [docs/ROADMAP.md](docs/ROADMAP.md) – convoy encounters plus siege escalation remain the largest blockers now that facilities/jobs and persistence are stitched together.
- Flesh out the remaining director stubs (zombies, vehicles) with full combat/AI, collisions, and convoy routing.
- Expand automated testing with Vitest as systems mature.
- Wire survivor job output and new heat/siege cues into facilities, sieges, and crafting speed bonuses.
- Extend persistence from a single-slot quick-save to chunk-delta serialization with multiple manual save slots and survivor mission state.

See [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/WORKLOG.md](docs/WORKLOG.md) for milestone planning and day-to-day execution notes.
