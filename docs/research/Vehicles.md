# Vehicles, Semis & Cargo Research

## References
- **Mad Max (2015)** – modular vehicle upgrades, fuel scarcity, car combat.
- **State of Decay 2** – vehicle persistence, trunk inventories, noise impact.
- **Euro Truck Simulator 2 / American Truck Simulator** – trailer hitching, cargo manifests, weight affecting handling.
- **Unturned** – transparent vehicle inventory overlay, fuel consumption model.
- **My Summer Car** – part-by-part maintenance loop.

## Findings
- Hitch/detach interactions benefit from generous alignment assists and progress bars telegraphing attachment time.
- Transparent cargo HUD should be accessible both in vehicle and while on foot near trailer.
- Weight and condition dramatically affect handling; ETS2 demonstrates torque scaling tied to cargo mass.
- Maintenance loops must balance realism with usability—highlighting failing parts (tires, battery) keeps clarity.

## Patterns Observed
- **Vehicle Stats** defined per archetype: seats, cargo, fuel, top speed, noise, health.
- **Trailer Types** with specialized capacity rules (fuel, refrigeration, vehicle slots).
- **Maintenance UI** surfaces part condition with clear thresholds and required tools.

## Implementation Plan
1. Model vehicles/trailers in JSON including compatible hitch types, cargo grid, weight caps.
2. Build `TrailerHitch` component to manage attach/detach states and constraints.
3. Implement `CargoManifest` to represent grid contents, nested vehicle storage, and mass calculations.
4. Create `TransparentCargoHUD` overlay that mirrors manifest state and supports drag/drop interactions.
5. Extend `VehicleController` to simulate fuel consumption, noise emission, and damage propagation.

## Assumptions
- Vehicle physics will remain simplified top-down (no suspension) but incorporate drag and turn radius adjustments from cargo weight.
- Refrigerated trailer power draw ties into base power grid once parked; on-road generator support is deferred to a later milestone.
