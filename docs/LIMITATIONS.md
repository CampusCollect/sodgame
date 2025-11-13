# Limitations & Risk Register

| Risk | Impact | Likelihood | Mitigation Now | Owner / Next Step |
|------|--------|------------|----------------|-------------------|
| Systems beyond the scaffold are stubbed | High | High | Ship modular placeholders with clear TODOs | Expand each director per roadmap |
| Research documentation incomplete | Medium | Low | Completed baseline research summaries | Revisit once playtests identify gaps |
| No automated gameplay tests yet | Medium | Medium | Maintain manual smoke steps, plan Vitest harness | Add integration tests when mechanics land |
| npm registry access restricted in container | Medium | Medium | Document issue, rely on cached deps/CI mirror | Configure private registry or vendored tarballs |
| Data sets do not meet final breadth (50+ items, etc.) | Medium | High | Provide representative samples + JSON schemas | Expand catalogs alongside feature sprints |
| Vehicle driving lacks collisions/damage + AI escorts | High | Medium | Added player-controlled driving, hints, and cargo HUD to unblock QA | Layer in collision volumes, damage, fuel, and NPC drivers |
| Save/load, networking, and persistence missing | High | High | Flagged as future milestone | Design serialization + migration plan |
| Survivor jobs not yet linked to facility throughput | Medium | Medium | Track assignments in controller, surface in UI | Apply production modifiers once facilities exist |
| Raid planner resolves combat abstractly | Medium | Medium | Provide loot/reputation deltas + intel logs in UI | Integrate world encounters + vehicle combat |
| Loot containers spawn at fixed demo spots and share one respawn timer | Low | Medium | Document locations + timers; hook into loot generator | Tie spawns to world chunks, add lockpicking + alarms |
| Alarm controller does not yet drive faction reinforcements | Medium | Medium | Trigger placeholder alarms off extreme noise | Wire alarms into faction AI + POI state machines |

## Known Gaps
- Mega-spec mechanics (crafting, advanced AI, factions, etc.) are not yet ported – this milestone focuses on architecture reset.
- Asset pipeline (sprites, audio) not wired; demo uses simple vector rendering.
- Save/load, networking, and persistence are unimplemented.
- UI overlays are DOM-based; controller support and accessibility testing remain TODO.
- Inventory weight checks currently reject entire stacks when capacity is exceeded rather than splitting or queuing overflow.
- Crafting assumes the player inventory doubles as both input and output storage; dedicated workstation inventories and survivor job hand-offs are still TODO.
- Crafting output currently fails silently into the void when inventories are full; hook up ground drops or station storage in the next sprint.
- Base building placements are instantaneous; survivor construction jobs, build timers, and structural integrity checks are deferred.
- Survivor morale events are manual triggers only for now; tie them to gameplay events (sieges, loot runs, deaths) during combat/AI integration.
- Raid planner/convoy ambushes are simulated via button presses – no physical convoy spawns or combat loops yet.
- Loot containers only exist in the starter biome for now and auto-open when in range; lockpicking, search times, and faction ownership modifiers remain TODO.
- Alarm HUD + stealth tools exist, but reinforcements, power cuts, and POI ownership changes are deferred for the faction combat milestone.
- Vehicle handling ignores collisions, damage, and trailer detach workflows for now; player can only drive the demo rigs.

Each milestone must update this register with fresh risks and mitigation status.
