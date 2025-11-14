# Zombie AI & Noise Research

## References
- **Project Zomboid** – deep hearing/vision model, migration, memory timers.
- **The Last of Us** – enemy archetypes with distinct sensory models (runners, clickers).
- **Metal Gear Solid V** – clear alert state telegraphing, noise visualization.
- **Left 4 Dead** – AI Director orchestrating horde intensity and special infected roles.

## Findings
- Audio-driven states provide emergent encounters when layered with memory decay.
- Distinct archetypes (shambler/runner/brute) keep combat varied and telegraph player priorities.
- Visual indicators for alert state dramatically reduce confusion in hectic fights.
- Shared horde controllers simplify migration logic and performance.

## Patterns Observed
- **State Machine** with Idle → Investigate → Search → Aggro loops and timers.
- **Noise Propagation**: event bus with attenuation, occlusion, and radius falloff.
- **Horde Management**: groups share goals and can be steered by global director logic.

## Implementation Plan
1. Implement `ZombieFSM` with typed states, timers, and transitions.
2. Create `NoisePropagation` service that registers emitters (weapons, vehicles) and notifies listeners.
3. Build `HordeController` to manage groups, escalate states, and path along road graph.
4. Expose debug overlay toggles to render vision cones, noise rings, and state icons.
5. Wire event hooks into player actions, vehicles, and environmental props.

## Assumptions
- Early milestone will approximate occlusion using tile tags rather than full acoustics simulation.
- Horde sizes will remain under 50 units until performance profiling is complete.
