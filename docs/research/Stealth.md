# Stealth, Noise & Alarm Research

## References
- **Metal Gear Solid V** – reflex mode, noise rings, guard alert phases.
- **Splinter Cell** – light/shadow gameplay, sound meters, stealth tools.
- **Far Cry 5** – alarm towers, reinforcement triggers, animal distractions.

## Findings
- Players rely on HUD cues (noise meters, light indicators) to judge stealth success.
- Alarm systems should be interactable (disable, destroy) with clear consequences.
- Noise propagation benefits from falloff curves and occlusion checks; MGSV’s visualized rings set expectations.

## Patterns Observed
- **Noise Bus** capturing events with location, intensity, tags.
- **Visibility Meter** aggregating light level, movement, stance.
- **Alarm Controller** tied to POIs with reinforcement timers and states.

## Implementation Plan
1. Build `NoiseBus` service with subscribe/emit semantics, storing active noise pulses.
2. Implement `VisibilitySystem` combining light sources, stance, and cover to compute detection score.
3. Create `AlarmController` that manages state transitions, reinforcement timers, and UI warnings.
4. Add stealth tool definitions (rocks, distractors, suppressors) to data layer.
5. Surface HUD widgets (noise meter, light indicator) with accessibility-friendly colors + icons.

## Assumptions
- Raycast-based light checks will use simplified 2D line sweeps for now; full shadow maps can wait.
- Alarm reinforcements spawn via abstracted event system until faction AI is online.
