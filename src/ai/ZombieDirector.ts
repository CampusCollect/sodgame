import type { Player } from "../entities/Player";
import type { World } from "../worldgen/World";
import type { Vector2 } from "../entities/Player";

interface Zombie {
  position: Vector2;
  state: "idle" | "investigating";
}

export class ZombieDirector {
  private readonly zombies: Zombie[] = [];

  constructor() {
    for (let i = 0; i < 12; i += 1) {
      this.zombies.push({
        position: { x: Math.random() * 800 - 400, y: Math.random() * 800 - 400 },
        state: "idle"
      });
    }
  }

  update(_dt: number, _world: World, player: Player): void {
    this.zombies.forEach(zombie => {
      const distance = Math.hypot(zombie.position.x - player.position.x, zombie.position.y - player.position.y);
      zombie.state = distance < 200 ? "investigating" : "idle";
    });
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2): void {
    const offset: Vector2 = {
      x: playerPosition.x - window.innerWidth / 2,
      y: playerPosition.y - window.innerHeight / 2
    };
    this.zombies.forEach(zombie => {
      ctx.fillStyle = zombie.state === "idle" ? "#f97316" : "#ef4444";
      ctx.beginPath();
      ctx.arc(zombie.position.x - offset.x, zombie.position.y - offset.y, 12, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
