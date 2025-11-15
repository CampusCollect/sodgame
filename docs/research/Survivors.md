# Survivors, Skills & Morale Research

## References
- **XCOM** – permadeath squads, class perks, fatigue/injury timers.
- **Rimworld** – traits, moodlets, social relationships, jobs.
- **State of Decay 2** – hero bonuses, morale, follower commands.

## Findings
- Personality traits drive emergent stories; Rimworld’s relationship matrix is the gold standard.
- Job assignments should impact facility efficiency and morale simultaneously.
- Morale swings need strong feedback (UI alerts, debuffs) to encourage intervention.
- Permadeath stakes motivate safer play; memorialization softens the blow and adds narrative.

## Patterns Observed
- **Skill Trees** with linear XP progression and milestone perks.
- **Morale Modifiers** accumulating from events, resources, relationships.
- **Relationship Graph** storing affinities per survivor pair to trigger friend/rival events.

## Implementation Plan
1. Define survivor schema capturing stats, skills, traits, morale, relationships.
2. Implement `SurvivorManager` for roster CRUD, recruitment, and persistence.
3. Build `MoraleSystem` computing daily adjustments from resources, deaths, victories.
4. Add `RelationshipGraph` to propagate friendship/rivalry changes and trigger events.
5. Provide `SurvivorPanel` UI listing survivors, skills, assignments, and morale warnings.

## Assumptions
- Relationship updates will tick hourly (in-game) to balance responsiveness with performance.
- Hero/Leader designation will be limited to one survivor until base upgrades unlock lieutenants.
