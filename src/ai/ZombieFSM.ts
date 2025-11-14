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
  hp: number;
}

export class ZombieFSM {
  private readonly zombies: ZombieInstance[] = [];
  private readonly definitions = new Map<string, ZombieTypeDefinition>();
  private readonly defaultWeights: Record<string, number> = {};

  constructor(zombieTypes: ZombieTypeDefinition[], initialCount = 24) {
    zombieTypes.forEach(type => {
      this.definitions.set(type.id, type);
      this.defaultWeights[type.id] = type.spawn_weight ?? 1;
    });
    const distribution = this.buildDistribution(this.defaultWeights);
    for (let i = 0; i < initialCount; i += 1) {
      this.zombies.push(this.spawnZombie(distribution));
    }
  }

  get activeZombies(): readonly ZombieInstance[] {
    return this.zombies;
  }

  applySpawnPlan(targetCount: number, weights: Record<string, number>): void {
    const distribution = this.buildDistribution(Object.keys(weights).length ? weights : this.defaultWeights);
    const clampedTarget = Math.max(6, Math.min(150, targetCount));
    while (this.zombies.length < clampedTarget) {
      this.zombies.push(this.spawnZombie(distribution));
    }
    while (this.zombies.length > clampedTarget) {
      this.zombies.pop();
    }
    this.zombies.forEach(zombie => {
      zombie.type = this.pickType(distribution);
      zombie.hp = zombie.type.hp;
    });
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

  private spawnZombie(distribution: WeightedType[]): ZombieInstance {
    const type = this.pickType(distribution);
    return {
      id: `z_${Math.random().toString(36).slice(2, 7)}`,
      type,
      position: randomSpawnPosition(),
      state: { state: "idle", timer: 0 },
      hp: type.hp
    };
  }

  applyDamage(id: string, damage: number): boolean {
    const index = this.zombies.findIndex(zombie => zombie.id === id);
    if (index === -1) {
      return false;
    }
    const zombie = this.zombies[index];
    zombie.hp -= damage;
    if (zombie.hp <= 0) {
      this.respawnZombie(index);
      return true;
    }
    zombie.state = { state: "aggro", target: zombie.state.state === "aggro" ? zombie.state.target : zombie.position, timer: 5 };
    return false;
  }

  private respawnZombie(index: number): void {
    const distribution = this.buildDistribution(this.defaultWeights);
    this.zombies.splice(index, 1);
    this.zombies.push(this.spawnZombie(distribution));
  }

  private buildDistribution(weights: Record<string, number>): WeightedType[] {
    const entries = Object.entries(weights).filter(([id, weight]) => this.definitions.has(id) && weight > 0);
    if (!entries.length) {
      return this.buildDistribution(this.defaultWeights);
    }
    const totalWeight = entries.reduce((total, [, weight]) => total + weight, 0);
    let cumulative = 0;
    return entries.map(([id, weight]) => {
      cumulative += weight / totalWeight;
      return { cumulative, definition: this.definitions.get(id)! };
    });
  }

  private pickType(distribution: WeightedType[]): ZombieTypeDefinition {
    if (!distribution.length) {
      const fallback = this.definitions.values().next().value;
      if (!fallback) {
        throw new Error("Zombie definitions missing");
      }
      return fallback;
    }
    const roll = Math.random();
    return distribution.find(entry => roll <= entry.cumulative)?.definition ?? distribution[distribution.length - 1].definition;
  }
}

interface WeightedType {
  cumulative: number;
  definition: ZombieTypeDefinition;
}

function randomSpawnPosition(): Vector2 {
  return { x: Math.random() * 1200 - 600, y: Math.random() * 1200 - 600 };
}
