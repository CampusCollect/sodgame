# WORKLOG

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
