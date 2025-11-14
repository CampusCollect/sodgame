# Progression, Difficulty & Endgame Research

## References
- **State of Decay 2** – region escalation, base sieges, survivor legacy.
- **Project Zomboid** – increasing threat over time, seasonal events.
- **Diablo III Adventure Mode** – difficulty scaling tied to gear power, seasonal ladders.

## Findings
- Region rings communicate difficulty visually and encourage scouting before diving deep.
- Adaptive systems need guardrails to avoid rubber-banding; telegraphing the player power score helps manage expectations.
- Seasonal modifiers refresh gameplay loops without requiring new assets.

## Patterns Observed
- **Power Score** computed from gear, survivors, and base upgrades, feeding into spawn tables.
- **Base Heat** tracking resources and defenses to trigger sieges.
- **Event Scheduler** injecting seasonal/weather modifiers.

## Implementation Plan
1. Define progression curve JSON covering ring thresholds, loot tiers, and enemy composition.
2. Implement `DifficultyScaler` that consumes player/base stats and adjusts spawn weights.
3. Build `BaseHeat` tracker hooked into loot storage, facility upgrades, and recent raids.
4. Create `SeasonalModifiers` service to broadcast active weather/season impacts to systems.
5. Document QA scenarios covering scaling, sieges, and seasonal transitions.

## Assumptions
- Time scale will be 1 in-game day per real-time hour for tuning; we can expose slider later.
- Seasonal events will be deterministic by world seed for single-player consistency.
