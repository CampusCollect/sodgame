# State of Decay Sandbox – Modular Reboot

This repository now ships a clean-room TypeScript/Vite foundation for the large-scale 2D survival sandbox. The previous monolithic HTML dump has been replaced by a modular runtime with clear seams for each system (world gen, inventory, AI, vehicles, etc.).

## Getting Started

```bash
npm install
npm run dev
```

The development server will auto-open the canvas demo. Use **WASD** to move and **Tab** to toggle the inventory overlay.

## Tech Stack

- [Vite](https://vitejs.dev) + TypeScript for hot-reload iteration.
- Modular directories under `src/` mirroring the mega-spec system boundaries (e.g. `worldgen`, `inventory`, `vehicles`).
- DOM overlays for HUD/inventory paired with canvas rendering for the simulation layer.

## Next Steps

- Flesh out the placeholder directors (zombies, vehicles) with data-driven behavior.
- Port the research-backed mechanics into their dedicated modules.
- Expand automated testing with Vitest as systems mature.

See [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/WORKLOG.md](docs/WORKLOG.md) for milestone planning and day-to-day execution notes.
