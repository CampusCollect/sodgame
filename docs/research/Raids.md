# Factions, Convoys & Raids Research

## References
- **Far Cry 4–6** – outpost alarms, reinforcement waves, stealth bonuses.
- **Payday 2** – heist planning, casing vs. loud phases, loot extraction.
- **Watch Dogs** – hacking tools, camera intel, pre-mission scouting.

## Findings
- Providing intel ahead of time empowers planning and reduces difficulty spikes.
- Alarm escalation should be predictable; players can prioritize destroying alarm boxes.
- Convoy ambushes thrive on roadblock mechanics and time pressure before reinforcements arrive.
- Reputation shifts must be communicated immediately to reinforce consequences.

## Patterns Observed
- **Mission Planner UI** with squad selection, loadouts, and objective preview.
- **Alarm States**: Stealth (green) → Suspicious (yellow) → Alarmed (red) with clear HUD cues.
- **Dynamic Rewards** tied to faction hostility and mission difficulty.

## Implementation Plan
1. Model factions, reputation thresholds, convoys, and outposts in JSON.
2. Implement `FactionManager` to track reputation, owned POIs, and hostility state.
3. Build `ConvoyScheduler` that emits upcoming convoy events and handles interception windows.
4. Create `RaidPlanner` UI bridging intel, squad selection, and mission launch.
5. Integrate success/failure hooks to adjust reputation, spawn reinforcements, and spawn loot manifests.

## Assumptions
- First milestone will script a single convoy route for demo purposes while scheduler scaffolding matures.
- Heist outcomes feed into narrative trackers later; for now we log events and adjust reputation only.
