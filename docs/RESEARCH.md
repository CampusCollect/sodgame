# Research Journal

This journal now summarizes the reference studies mandated by the mega-spec. Each section links to a deep-dive in `docs/research/` and captures high-level direction, design patterns, and open assumptions before implementation begins.

| System | Status | Notes |
|--------|--------|-------|
| World Generation & Streaming | ✅ Documented | See `docs/research/WorldGen.md` for biome graph, chunk streaming, and road research. |
| Inventory, Storage & Containers | ✅ Documented | Hybrid Unturned/Tarkov grid design captured in `docs/research/Inventory.md`. |
| Crafting, Blueprints & Workstations | ✅ Documented | Tiered stations and queue plans in `docs/research/Crafting.md`. |
| Zombie AI, Noise & Hordes | ✅ Documented | FSM + noise bus insights in `docs/research/ZombieAI.md`. |
| Vehicles, Trailers & Cargo | ✅ Documented | Hitching, manifests, maintenance loops in `docs/research/Vehicles.md`. |
| Base Building & Power | ✅ Documented | Placement, facilities, power routing in `docs/research/BaseBuilding.md`. |
| Survivors, Skills & Morale | ✅ Documented | Trait, morale, relationships in `docs/research/Survivors.md`. |
| Factions, Convoys & Raids | ✅ Documented | Intel, planners, reputation loops in `docs/research/Raids.md`. |
| Loot Economy & Traders | ✅ Documented | Tiering, barter, blueprint drops in `docs/research/Loot.md`. |
| Stealth, Noise & Alarms | ✅ Documented | Noise bus and alarm controller in `docs/research/Stealth.md`. |
| Progression & Endgame | ✅ Documented | Power score, heat, seasonal modifiers in `docs/research/Progression.md`. |

## Next Steps
- Incorporate research findings into module scaffolds and data models.
- Validate assumptions during prototyping; log deviations in `WORKLOG.md`.
