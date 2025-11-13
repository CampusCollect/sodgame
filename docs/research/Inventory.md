# Inventory & Storage Research

## References
- **Unturned** – transparent container overlays, grid packing with rotation, vehicle cargo manifests.
- **Resident Evil 4** – Tetris-style attache case emphasizing spatial efficiency.
- **Escape from Tarkov** – nested containers, weight penalties, context actions.
- **DayZ** – clothing slots plus vicinity loot streams.

## Findings
- Players respond well to hybrid solutions where quick-access slots coexist with spatial backpacks (Unturned + Tarkov).
- Transparency overlays allow looting without fully blocking situational awareness.
- Rotation and nested containers dramatically increase agency but require strong affordances and tooltips.
- Weight penalties should be telegraphed; Tarkov’s stamina drain model is a good starting point.

## Patterns Observed
- **Primary Action**: drag-and-drop across player, container, ground columns with instant feedback.
- **Secondary Action**: right-click context menus or controller radial menus for split, drop, inspect.
- **State Feedback**: item condition bars and weight meters keep the player oriented.
- **Nested Views**: overlaying modal panels that keep parent inventory visible avoids disorientation.

## Implementation Plan
1. Define JSON schemas for items, containers, and weight rules.
2. Build `GridInventory` core module that supports variable grid sizes, rotations, stack splitting, and collisions.
3. Wire `TransparentContainerHUD` as DOM-driven overlay that reflects live inventory state for player + container.
4. Add weight model to player actor; integrate with movement speed modifiers.
5. Support nested containers by tracking breadcrumb stack and animating transitions instead of new windows.

## Assumptions
- Controller support will reuse keyboard logic through focus management rather than bespoke UI components for the first pass.
- Grid cell size will remain 48px in HUD to balance readability and screen coverage on 1080p monitors.
