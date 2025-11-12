import type { Vector2 } from "../entities/Player";
import type { ZombieInstance } from "./ZombieFSM";

export interface Horde {
  id: string;
  members: ZombieInstance[];
  state: "wandering" | "migrating" | "sieging";
  target: Vector2 | null;
}

export class HordeController {
  private readonly hordes: Horde[] = [];

  registerHorde(horde: Horde): void {
    this.hordes.push(horde);
  }

  getActiveHordes(): readonly Horde[] {
    return this.hordes;
  }

  update(delta: number, playerPosition: Vector2): void {
    this.hordes.forEach(horde => {
      if (horde.state === "wandering" && Math.random() < 0.01 * delta) {
        horde.state = "migrating";
        horde.target = playerPosition;
      }
      if (horde.state === "migrating" && horde.target) {
        const centroid = this.computeCentroid(horde.members);
        const dx = horde.target.x - centroid.x;
        const dy = horde.target.y - centroid.y;
        if (Math.hypot(dx, dy) < 25) {
          horde.state = "sieging";
        }
      }
    });
  }

  private computeCentroid(members: ZombieInstance[]): Vector2 {
    if (members.length === 0) {
      return { x: 0, y: 0 };
    }
    const sum = members.reduce(
      (acc, zombie) => ({ x: acc.x + zombie.position.x, y: acc.y + zombie.position.y }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / members.length, y: sum.y / members.length };
  }
}
