# Crafting & Workstations Research

## References
- **Far Cry 3–6** – gated crafting via story progression and resource tiers, quick crafting UI.
- **7 Days to Die** – workstation tiers, skill requirements, queued production with time costs.
- **The Forest** – radial crafting mat with blueprint discovery and combination previews.

## Findings
- Tiered workstations gate player power without resorting to arbitrary level requirements.
- Queue-based crafting plus time cost encourages base defense while items build.
- Blueprint unlocks should be persistent account-level once researched to avoid grind.
- Failure chances keep low-skilled survivors meaningful without forcing total RNG.

## Patterns Observed
- **Recipe Cards** show required materials, skill gates, craft time, and expected output.
- **Queue Management** allows pausing/cancelling; production consumes fuel/power while active.
- **Skill Hooks**: bonuses to output quality or craft speed, often tied to survivors assigned to workstation.

## Implementation Plan
1. Define `Recipe`, `Blueprint`, and `Workstation` schemas in JSON; include station tier and skill requirements.
2. Build `CraftingQueue` module that consumes recipes, ticks timers, and pushes output to station inventory.
3. Integrate with survivor job system so assigned survivors run queues and apply skill modifiers.
4. Surface UI tabs for Available/Locked/All recipes with filtering by station tier.
5. Emit events to notification center when crafts complete or fail.

## Assumptions
- Crafting time uses real-time seconds scaled by a global multiplier to support accessibility options later.
- Failure mode will degrade materials into scrap items rather than deleting them entirely to reduce frustration.
