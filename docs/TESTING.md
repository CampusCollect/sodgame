# Testing Playbook

## Commands
- `npm run test` – executes Vitest (placeholder suite until systems are implemented).
- `npm run lint` – runs ESLint across all TypeScript modules.
- `npm run build` – ensures the Vite bundle compiles without type errors.

## Manual Smoke
1. `npm run dev` to start the development server.
2. Move with **WASD** and confirm the camera-centred rendering updates the HUD coordinates.
3. Observe zombie circles change glyph/colour as they hear player footsteps (step around to emit noise rings).
4. Press **Tab** to open/close the inventory overlay; confirm items load from JSON definitions and condition metadata populates cells.
5. Inspect the bottom-left transparent HUDs by calling `window.game.inventory.toggle()` and `window.game.zombies` from the console to ensure overlays instantiate without errors.
6. Verify trailers spawn attached to the semi in the world and the transparent cargo HUD can be invoked via `new TransparentCargoHUD('Demo').showForTrailer(...)` in console for debugging.

Future QA scenarios from the mega-spec will be added as systems come online.
