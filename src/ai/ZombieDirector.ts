import type { Player } from "../entities/Player";
import type { World } from "../worldgen/World";
import type { Vector2 } from "../entities/Player";
import { content } from "../data";
import { ZombieFSM, type ZombieInstance } from "./ZombieFSM";
import { NoiseBus } from "../stealth/NoiseBus";
import { HordeController } from "./HordeController";

type ZombieStateId = ZombieInstance["state"] extends { state: infer S } ? S : never;

export class ZombieDirector {
  private readonly fsm = new ZombieFSM(content.zombie_types, 18);
  private readonly noise: NoiseBus;
  private readonly hordes = new HordeController();

  constructor(noise?: NoiseBus) {
    this.noise = noise ?? new NoiseBus(content.noise_classes);
    const zombies = this.fsm.activeZombies;
    this.hordes.registerHorde({ id: "starter", members: [...zombies], state: "wandering", target: null });
  }

  update(deltaTime: number, _world: World, player: Player): void {
    this.fsm.update(deltaTime, player.position, this.noise.getActiveEvents());
    this.hordes.update(deltaTime, player.position);
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2): void {
    const offset: Vector2 = {
      x: playerPosition.x - window.innerWidth / 2,
      y: playerPosition.y - window.innerHeight / 2
    };
    this.fsm.activeZombies.forEach(zombie => {
      ctx.fillStyle = this.getColorForState(zombie.state.state);
      ctx.beginPath();
      ctx.arc(zombie.position.x - offset.x, zombie.position.y - offset.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.font = "10px sans-serif";
      ctx.fillText(this.getGlyph(zombie.state.state), zombie.position.x - offset.x - 4, zombie.position.y - offset.y + 3);
    });

    this.noise.getActiveEvents().forEach(event => {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
      ctx.beginPath();
      ctx.arc(event.position.x - offset.x, event.position.y - offset.y, event.range, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  private getColorForState(state: ZombieStateId): string {
    switch (state) {
      case "idle":
        return "#f97316";
      case "investigating":
      case "frantic":
        return "#facc15";
      case "aggro":
      case "aggro-search":
        return "#ef4444";
      case "feeding":
        return "#22d3ee";
      default:
        return "#f97316";
    }
  }

  private getGlyph(state: ZombieStateId): string {
    switch (state) {
      case "idle":
        return "·";
      case "investigating":
        return "?";
      case "frantic":
        return "!";
      case "aggro":
        return "⚠";
      case "aggro-search":
        return "✦";
      case "feeding":
        return "✚";
      default:
        return "·";
    }
  }

  applyDifficulty(targetCount: number, mix: Record<string, number>): void {
    this.fsm.applySpawnPlan(targetCount, mix);
  }

  getZombies(): readonly ZombieInstance[] {
    return this.fsm.activeZombies;
  }

  applyDamage(id: string, damage: number): boolean {
    return this.fsm.applyDamage(id, damage);
  }
}
