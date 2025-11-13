import type { Player } from "../entities/Player";
import type { World } from "../worldgen/World";
import type { Vector2 } from "../entities/Player";
import { content } from "../data";
import { TrailerHitch } from "./TrailerHitch";
import { CargoManifest } from "./CargoManifest";

interface VehicleInstance {
  definitionId: string;
  position: Vector2;
  facing: number;
  hitch?: TrailerHitch;
  manifest?: CargoManifest;
}

export class VehicleDirector {
  private readonly vehicles: VehicleInstance[] = [];

  constructor() {
    const spawnPoints: Vector2[] = [
      { x: 180, y: -120 },
      { x: -220, y: 200 },
      { x: 60, y: 260 }
    ];
    content.vehicles.forEach((vehicle, index) => {
      const position = spawnPoints[index % spawnPoints.length];
      const instance: VehicleInstance = {
        definitionId: vehicle.id,
        position: { ...position },
        facing: 0
      };
      if (vehicle.requires_trailer) {
        const trailerDef = content.trailers.find(t => vehicle.compatible_trailers.includes(t.id));
        if (trailerDef) {
          instance.hitch = new TrailerHitch(vehicle);
          instance.hitch.attach(trailerDef);
          instance.manifest = new CargoManifest(trailerDef);
        }
      }
      this.vehicles.push(instance);
    });
  }

  update(_dt: number, _world: World, _player: Player): void {
    // placeholder for AI driving, noise hooks, and maintenance decay
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2): void {
    const offset: Vector2 = {
      x: playerPosition.x - window.innerWidth / 2,
      y: playerPosition.y - window.innerHeight / 2
    };

    this.vehicles.forEach(vehicle => {
      const def = content.vehicles.find(v => v.id === vehicle.definitionId);
      if (!def) return;

      ctx.save();
      ctx.translate(vehicle.position.x - offset.x, vehicle.position.y - offset.y);
      ctx.rotate(vehicle.facing);
      ctx.fillStyle = def.requires_trailer ? "#dc2626" : "#94a3b8";
      ctx.fillRect(-28, -56, 56, 112);
      ctx.restore();

      if (vehicle.hitch?.current.attached && vehicle.hitch.current.trailer) {
        ctx.save();
        ctx.translate(vehicle.position.x - offset.x - 80, vehicle.position.y - offset.y);
        ctx.fillStyle = "#64748b";
        const trailer = vehicle.hitch.current.trailer;
        ctx.fillRect(-trailer.grid[0], -trailer.grid[1], trailer.grid[0] * 4, trailer.grid[1] * 4);
        ctx.restore();
      }
    });
  }
}
