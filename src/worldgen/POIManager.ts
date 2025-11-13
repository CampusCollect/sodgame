import type { BiomeDefinition, PoiTypeDefinition } from "../data/ContentRegistry";
import type { Vector2 } from "../entities/Player";
import { CHUNK_SIZE, TILE_SIZE, type ChunkPoi } from "./Chunk";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = t;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCoordinates(x: number, y: number): number {
  const PRIME = 374761393;
  let hash = PRIME + x * 3266489917 + y * 668265263;
  hash = (hash ^ (hash >> 13)) * 1274126177;
  return hash >>> 0;
}

export class POIManager {
  constructor(private readonly poiTypes: PoiTypeDefinition[]) {}

  generateForChunk(
    chunkX: number,
    chunkY: number,
    biome: BiomeDefinition,
    seedOverride: number,
    chunkWorldPosition: Vector2
  ): ChunkPoi[] {
    const rng = mulberry32(seedOverride ^ hashCoordinates(chunkX, chunkY));
    const placements: ChunkPoi[] = [];

    for (const poi of this.poiTypes) {
      if (!poi.biomes.includes(biome.id)) continue;

      const categoryWeight = biome.poi_weights[poi.category] ?? 1;
      const spawnChance = Math.min(0.95, poi.spawn_chance * categoryWeight);
      const variation = Math.max(0, poi.max_per_chunk - poi.min_per_chunk);
      const attempts = poi.min_per_chunk + Math.floor(rng() * (variation + 1));

      for (let i = 0; i < attempts; i += 1) {
        if (rng() > spawnChance) continue;
        const localX = Math.floor(rng() * Math.max(1, CHUNK_SIZE - poi.size[0]));
        const localY = Math.floor(rng() * Math.max(1, CHUNK_SIZE - poi.size[1]));
        const worldPosition: Vector2 = {
          x: chunkWorldPosition.x + localX * TILE_SIZE,
          y: chunkWorldPosition.y + localY * TILE_SIZE
        };

        if (this.intersectsExisting(placements, worldPosition, poi.size)) {
          continue;
        }

        placements.push({
          id: `${poi.id}_${chunkX}_${chunkY}_${i}`,
          typeId: poi.id,
          name: poi.name,
          category: poi.category,
          worldPosition,
          size: poi.size,
          lootTable: poi.loot_table,
          respawnDays: poi.respawn_days,
          alarm: poi.alarm,
          isMajor: Boolean(poi.is_major),
          zombieDensity: poi.zombie_density
        });
      }
    }

    return placements;
  }

  private intersectsExisting(existing: ChunkPoi[], worldPosition: Vector2, size: [number, number]): boolean {
    const bounds = {
      x1: worldPosition.x,
      y1: worldPosition.y,
      x2: worldPosition.x + size[0] * TILE_SIZE,
      y2: worldPosition.y + size[1] * TILE_SIZE
    };

    return existing.some((poi) => {
      const other = {
        x1: poi.worldPosition.x,
        y1: poi.worldPosition.y,
        x2: poi.worldPosition.x + poi.size[0] * TILE_SIZE,
        y2: poi.worldPosition.y + poi.size[1] * TILE_SIZE
      };
      return !(bounds.x2 <= other.x1 || bounds.x1 >= other.x2 || bounds.y2 <= other.y1 || bounds.y1 >= other.y2);
    });
  }
}
