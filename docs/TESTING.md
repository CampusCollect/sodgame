# Testing Playbook

## Commands
- `npm run test` – executes Vitest (placeholder suite until systems are implemented).
- `npm run lint` – runs ESLint across all TypeScript modules.
- `npm run build` – ensures the Vite bundle compiles without type errors.

## Manual Smoke
1. `npm run dev` to start the development server.
2. Move with **WASD** and confirm the camera-centred rendering updates the HUD coordinates.
3. Hold **Shift** to sprint, then tap **Ctrl** to crouch. The new noise meter (bottom-left) should spike into yellow/red while sprinting and drop into green when crouched; the light indicator should swap icons as the simulated day/night cycle progresses.
4. Press **Z** to cycle through stealth tools and **X** to deploy one – the tooltip should update with the selected tool/cooldown and zombies should path toward the emitted noise ring.
5. Observe zombie circles change glyph/colour as they hear player footsteps or distraction tools (step around to emit noise rings).
6. Press **Tab** to open/close the inventory overlay; confirm multi-cell items span the expected grid footprint, rotation badges appear, and the header weight readout updates when items are added/removed via `window.game.player.inventory.add(...)`.
7. Tap **C** to open the crafting planner. Queue the `Craft Bandage` recipe – the player inventory should lose two cloth scraps and gain a bandage after ~10 seconds. Triggering a recipe without enough materials should surface an inline error message.
8. Press **B** to open the base building planner. Select the diesel generator, hover near the player to preview the ghost outline, and left-click to place – the UI should deduct metal/circuit materials and the power summary should increase available kW. Place a powered gate next to it and observe the outline turn red if you try overlapping structures. Toggle **B** again to hide the planner.
9. Walk toward one of the teal storage crates north-east of spawn. When you are within a few tiles, the transparent container HUD should appear with the crate’s grid layout and **E – Loot All** hint. Press **E** (or click *Loot All*) to transfer stacks into the backpack; confirm the HUD updates and the player inventory gains the items. Wait ~90 seconds and confirm the crate refills after being emptied.
10. Verify trailers spawn attached to the semi in the world and the transparent cargo HUD can be invoked via `new TransparentCargoHUD('Demo').showForTrailer(...)` in console for debugging.
11. Press **J** to open the survivor roster. Change Mateos's assignment to Mechanic, trigger the "Mission Success" morale button, and confirm morale/relationship numbers update while the roster list reflects the new job label. Close the panel with the × button or **J** again.
12. Hit **R** to open the raid planner. Observe faction standings, wait ~30 seconds for a convoy intel window, then click **Ambush** – the status banner should confirm success, reputation drops for that faction, and the intel feed log captures the loot summary.

Future QA scenarios from the mega-spec will be added as systems come online.
