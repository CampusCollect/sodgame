import type { Player } from "../entities/Player";
import type { World } from "../worldgen/World";
import type { Vector2 } from "../entities/Player";

interface Vehicle {
  id: string;
  position: Vector2;
  facing: number;
}

export class VehicleDirector {
  private readonly vehicles: Vehicle[] = [
    { id: "sedan", position: { x: 180, y: -120 }, facing: Math.PI / 2 },
    { id: "semi", position: { x: -220, y: 200 }, facing: 0 }
  ];

  update(_dt: number, _world: World, _player: Player): void {
    // placeholder for AI driving, noise hooks, etc.
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2): void {
    const offset: Vector2 = {
      x: playerPosition.x - window.innerWidth / 2,
      y: playerPosition.y - window.innerHeight / 2
    };

    this.vehicles.forEach(vehicle => {
      ctx.save();
      ctx.translate(vehicle.position.x - offset.x, vehicle.position.y - offset.y);
      ctx.rotate(vehicle.facing);
      ctx.fillStyle = vehicle.id === "semi" ? "#dc2626" : "#94a3b8";
      ctx.fillRect(-28, -56, 56, 112);
      ctx.restore();
    });
  }
}
