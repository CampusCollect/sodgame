# Testing Playbook

## Commands
- `npm run test` – executes Vitest (placeholder suite until systems are implemented).
- `npm run lint` – runs ESLint across all TypeScript modules.
- `npm run build` – ensures the Vite bundle compiles without type errors.

## Manual Smoke
1. `npm run dev` to start the development server.
2. Move with **WASD** and confirm the camera-centred rendering updates the HUD coordinates.
3. Observe zombie circles change glyph/colour as they hear player footsteps (step around to emit noise rings).
4. Press **Tab** to open/close the inventory overlay; confirm multi-cell items span the expected grid footprint, rotation badges appear, and the header weight readout updates when items are added/removed via `window.game.player.inventory.add(...)`.
5. Tap **C** to open the crafting planner. Queue the `Craft Bandage` recipe – the player inventory should lose two cloth scraps and gain a bandage after ~10 seconds. Triggering a recipe without enough materials should surface an inline error message.
6. Inspect the bottom-left transparent HUDs by calling `window.game.inventory.toggle()` and `window.game.player.inventory.getRenderState()` from the console to ensure container overlays reuse the same grid rendering logic.
7. Verify trailers spawn attached to the semi in the world and the transparent cargo HUD can be invoked via `new TransparentCargoHUD('Demo').showForTrailer(...)` in console for debugging.

Future QA scenarios from the mega-spec will be added as systems come online.
