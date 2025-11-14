import type { BiomeDefinition } from "../data/ContentRegistry";

const WORLD_SEED = 133742;

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function pseudoNoise(x: number, y: number, key: string): number {
  const val = Math.sin(x * 9283.12 + y * 1291.77 + hash(key) + WORLD_SEED) * 43758.5453;
  return val - Math.floor(val);
}

export class BiomeManager {
  constructor(private readonly biomes: BiomeDefinition[]) {}

  getBiome(chunkX: number, chunkY: number): BiomeDefinition {
    const radius = Math.sqrt(chunkX * chunkX + chunkY * chunkY);
    let best = this.biomes[0];
    let bestScore = -Infinity;

    for (const biome of this.biomes) {
      const distancePenalty = Math.abs(radius - biome.ideal_radius) / Math.max(1, biome.falloff);
      const distanceScore = Math.max(0, 1 - distancePenalty);
      const noise = pseudoNoise(chunkX, chunkY, biome.id);
      const score = distanceScore * biome.weight + noise * 0.35;
      if (score > bestScore) {
        bestScore = score;
        best = biome;
      }
    }

    return best;
  }
}
