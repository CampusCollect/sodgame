# Limitations & Risk Register

| Risk | Impact | Likelihood | Mitigation Now | Owner / Next Step |
|------|--------|------------|----------------|-------------------|
| Systems beyond the scaffold are stubbed | High | High | Ship modular placeholders with clear TODOs | Expand each director per roadmap |
| Research documentation incomplete | Medium | Low | Completed baseline research summaries | Revisit once playtests identify gaps |
| No automated gameplay tests yet | Medium | Medium | Maintain manual smoke steps, plan Vitest harness | Add integration tests when mechanics land |
| npm registry access restricted in container | Medium | Medium | Document issue, rely on cached deps/CI mirror | Configure private registry or vendored tarballs |
| Data sets do not meet final breadth (50+ items, etc.) | Medium | High | Provide representative samples + JSON schemas | Expand catalogs alongside feature sprints |
| Vehicle driving lacks collisions/damage + AI escorts | High | Medium | Added player-controlled driving, hints, and cargo HUD to unblock QA | Layer in collision volumes, damage, fuel, and NPC drivers |
| Persistence limited to a single quick-save slot (no chunk delta migrations) | Medium | Medium | Added F5/F9 quick-save tied to player/base/container state | Extend to multi-slot saves, chunk deltas, and survivor mission logs |
| Survivor jobs not yet linked to facility throughput | Low | Low | Facilities now read job stats to accelerate builds/production and push output into the shared stockpile | Extend to morale/fatigue penalties and survivor scheduling |
| Raid planner resolves combat abstractly | Medium | Medium | Added search/filter/track UI plus tooltip feedback so intel clicks always respond | Integrate world encounters + vehicle combat |
| POI templates spawn loot scenes only (no walls/alarms yet) | Medium | Medium | Containers now sync to POIs with template data | Expand templates with interior tiles, locks, and faction state |
| Alarm controller does not yet drive faction reinforcements | Medium | Medium | Trigger placeholder alarms off extreme noise | Wire alarms into faction AI + POI state machines |
| Player/zombie combat still lacks cover/collision handling | High | Medium | Player vitals + zombie melee damage + quick-heal loop now live | Add projectile obstacles, weapon jamming, and knockback |
| Progression/heat scoring uses heuristic proxies (inventory weight + structure HP) | Medium | Medium | Heat model now ingests the base stockpile value + defense score | Tie sieges/reinforcements directly to resource categories and facility uptime |
| Chunk streaming currently lives only in-memory | High | Medium | Deterministic seeds keep POIs/roads reproducible | Add save/load of chunk deltas + async IO |
| Road network is visual-only | Medium | Medium | Display spline-like overlays for navigation cues | Hook roads into convoy AI, collisions, and barricade gameplay |

## Known Gaps
- Mega-spec mechanics (crafting, advanced AI, factions, etc.) are not yet ported – this milestone focuses on architecture reset.
- Asset pipeline (sprites, audio) not wired; demo uses simple vector rendering.
- Persistence exists only as a single-slot quick-save; there is no slot management, survivor mission logging, or chunk-level delta streaming yet.
- UI overlays are DOM-based; controller support and accessibility testing remain TODO.
- Inventory weight checks currently reject entire stacks when capacity is exceeded rather than splitting or queuing overflow.
- Crafting assumes the player inventory doubles as both input and output storage; dedicated workstation inventories and survivor job hand-offs are still TODO.
- Crafting output currently fails silently into the void when inventories are full; hook up ground drops or station storage in the next sprint.
- Facility production does not yet consume upkeep/fuel or respect blueprint gating beyond tier data; integrate blueprint unlocks and survivor fatigue in a future pass.
- Base building placements are instantaneous; survivor construction jobs, build timers, and structural integrity checks are deferred.
- Survivor morale events are manual triggers only for now; tie them to gameplay events (sieges, loot runs, deaths) during combat/AI integration.
- Raid planner/convoy ambushes are simulated via button presses – no physical convoy spawns or combat loops yet.
- Weapons now fire projectiles and damage zombies; the player can take melee damage but bullets still ignore cover, weapons never jam, and zombie attacks lack knockback animations.
- Grenade simulation is limited to zombie damage + HUD cues; there is no terrain destruction, friendly-fire, or fire propagation yet and explosions do not affect faction AI beyond noise.
- Lockpicking/search timers now gate containers, but there is still no dedicated minigame, survivor skill bonus, or lockpick durability/failure state and forced entry emits a single generic noise event.
- Alarm HUD + stealth tools exist, but reinforcements, power cuts, and POI ownership changes are deferred for the faction combat milestone.
- POI templates do not yet include collision tiles, barricades, or faction NPC spawns; they currently place loot containers only.
- Road network does not yet constrain vehicle physics or convoy routing; it is a navigational overlay only.
- Vehicle handling ignores collisions, damage, and trailer detach workflows for now; player can only drive the demo rigs.
- Base heat currently treats backpack weight as "loot value" and structure HP as "defense"; hook into real storage/facility stats once those systems exist.

Each milestone must update this register with fresh risks and mitigation status.
