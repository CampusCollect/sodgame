# Base Building & Facilities Research

## References
- **Fallout 4** – settlement snapping, power connectors, defense ratings.
- **State of Decay 2** – facility slots, morale effects, sieges.
- **Rust** – building tiers, tool cupboards for upkeep.
- **7 Days to Die** – structural integrity, horde night assaults.

## Findings
- Grid snapping plus rotation helpers makes construction approachable even with controller input.
- Power grids require intuitive visualization; Fallout 4’s wire lines plus power numbers are a good precedent.
- Facility tiers should clearly communicate production benefits and staffing requirements.
- Structural upgrades and defensive scores must feed into siege scaling.

## Patterns Observed
- **Placement Preview**: ghost objects showing footprint, resource cost, and stability.
- **Power Management**: per-structure consumption with prioritized shutoff during brownouts.
- **Job Assignment**: survivors slotted into facilities for production bonuses.

## Implementation Plan
1. Expand placement system with grid occupancy map and collision checks for structures.
2. Model facilities/upgrades in JSON with inputs (materials, time, blueprint requirements) and outputs.
3. Implement `PowerGrid` manager that tracks generators, consumers, and outages with UI feedback.
4. Tie survivors into facilities via `JobAssignment` service, affecting craft speed/production.
5. Emit events for base heat and siege triggers based on stored loot and defense rating.

## Assumptions
- Early builds will not simulate structural collapse; instead, we reduce HP when supports are missing and flag TODO for physics pass.
- Facility construction times use accelerated real-time (minutes not hours) for milestone demos.
