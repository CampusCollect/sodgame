import type { NoiseEvent } from "../stealth/NoiseBus";
import type { Vector2 } from "../entities/Player";
import type { ZombieTypeDefinition } from "../data/ContentRegistry";

type ZombieState =
  | { state: "idle"; timer: number }
  | { state: "investigating"; target: Vector2; timer: number }
  | { state: "frantic"; target: Vector2; timer: number }
  | { state: "aggro"; target: Vector2; timer: number }
  | { state: "aggro-search"; target: Vector2; timer: number }
  | { state: "feeding"; timer: number };

export interface ZombieInstance {
  id: string;
  type: ZombieTypeDefinition;
  position: Vector2;
  state: ZombieState;
}

export class ZombieFSM {
  private readonly zombies: ZombieInstance[] = [];

  constructor(zombieTypes: ZombieTypeDefinition[], initialCount = 24) {
    for (let i = 0; i < initialCount; i += 1) {
      const type = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
      this.zombies.push({
        id: `z_${i}`,
        type,
        position: { x: Math.random() * 600 - 300, y: Math.random() * 600 - 300 },
        state: { state: "idle", timer: 0 }
      });
    }
  }

  get activeZombies(): readonly ZombieInstance[] {
    return this.zombies;
  }

  update(delta: number, playerPosition: Vector2, noises: NoiseEvent[]): void {
    this.zombies.forEach(zombie => {
      const state = zombie.state;
      switch (state.state) {
        case "idle":
          this.checkNoise(zombie, noises);
          break;
        case "investigating":
        case "frantic":
        case "aggro-search":
          this.advanceToward(zombie, state.target, delta);
          this.tickTimer(zombie, delta, "idle");
          break;
        case "aggro":
          this.advanceToward(zombie, playerPosition, delta);
          zombie.state = { ...state, timer: 5 };
          break;
        case "feeding":
          this.tickTimer(zombie, delta, "idle");
          break;
        default:
          break;
      }
      const distanceToPlayer = Math.hypot(zombie.position.x - playerPosition.x, zombie.position.y - playerPosition.y);
      if (distanceToPlayer < 120 && state.state !== "feeding") {
        zombie.state = { state: "aggro", target: playerPosition, timer: 5 };
      }
    });
  }

  private tickTimer(zombie: ZombieInstance, delta: number, fallback: "idle" | "feeding"): void {
    const next = { ...zombie.state, timer: zombie.state.timer - delta } as ZombieState;
    if (next.timer <= 0) {
      zombie.state = { state: fallback, timer: 0 };
    } else {
      zombie.state = next;
    }
  }

  private checkNoise(zombie: ZombieInstance, noises: NoiseEvent[]): void {
    for (const noise of noises) {
      const distance = Math.hypot(zombie.position.x - noise.position.x, zombie.position.y - noise.position.y);
      if (distance <= noise.range) {
        zombie.state = {
          state: noise.intensity > 70 ? "frantic" : "investigating",
          target: noise.position,
          timer: noise.duration
        };
        return;
      }
    }
  }

  private advanceToward(zombie: ZombieInstance, target: Vector2, delta: number): void {
    const dx = target.x - zombie.position.x;
    const dy = target.y - zombie.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) {
      return;
    }
    const speed = zombie.type.speed_ms;
    zombie.position = {
      x: zombie.position.x + (dx / distance) * speed * delta,
      y: zombie.position.y + (dy / distance) * speed * delta
    };
  }
}
