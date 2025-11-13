# Loot, Economy & Blueprint Research

## References
- **Escape from Tarkov** – loot tiers, barter economy, trader reputation.
- **Borderlands** – rarity colors, procedural weapon stats.
- **The Division** – Dark Zone extraction and contamination risk.

## Findings
- Tiered regions keep exploration meaningful; Tarkov’s location-based loot drives progression loops.
- Barter systems reduce need for universal currency and align with apocalypse fantasy.
- Condition/durability ties into crafting and maintenance, encouraging trade-offs between using and selling gear.

## Patterns Observed
- **Loot Tables** defined per container/zone with weighted items and quantity ranges.
- **Rarity Colors** aligning with stat bonuses and drop effects.
- **Trader Rotations** tied to reputation and restock timers.

## Implementation Plan
1. Author JSON loot tables keyed by biome, POI type, container archetype, and zombie type.
2. Implement `LootGenerator` that rolls tiers, rarity, condition, and stack sizes.
3. Build `TraderInventory` + `BarterSystem` to convert barter values into trade offers.
4. Integrate blueprint drops with crafting unlock registry.
5. Add dynamic respawn timers per container with world clock integration.

## Assumptions
- Early milestone will simulate rarity stats as simple damage/armor multipliers; procedural part generation comes later.
- Trader interface will start as text-based overlay before migrating to full 3D vendor scenes.
