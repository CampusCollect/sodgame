import { content } from "../data";
import type { ProgressionRingDefinition } from "../data/ContentRegistry";

const METERS_PER_KM = 1000;

export interface DifficultySnapshot {
  ring: number;
  maxRing: number;
  playerDistanceKm: number;
  lootTiers: number[];
  spawnMix: Record<string, number>;
  spawnTarget: number;
  difficultyFactor: number;
}

export class DifficultyScaler {
  private readonly rings: ProgressionRingDefinition[];

  constructor() {
    this.rings = [...content.progression.rings].sort((a, b) => a.ring - b.ring);
  }

  evaluate(distanceMeters: number, communityPower: number): DifficultySnapshot {
    const distanceKm = Math.max(0, distanceMeters / METERS_PER_KM);
    const ringDefinition = this.findRing(distanceKm);
    const maxRing = this.rings[this.rings.length - 1]?.ring ?? ringDefinition.ring;
    const spawnTarget = Math.round(16 + ringDefinition.ring * 6 + communityPower);
    const difficultyFactor = Number((ringDefinition.ring + communityPower / 10).toFixed(2));
    return {
      ring: ringDefinition.ring,
      maxRing,
      playerDistanceKm: Number(distanceKm.toFixed(2)),
      lootTiers: ringDefinition.loot_tiers,
      spawnMix: ringDefinition.zombie_weights,
      spawnTarget,
      difficultyFactor
    };
  }

  private findRing(distanceKm: number): ProgressionRingDefinition {
    for (const ring of this.rings) {
      if (distanceKm <= ring.radius_km) {
        return ring;
      }
    }
    return this.rings[this.rings.length - 1];
  }
}
