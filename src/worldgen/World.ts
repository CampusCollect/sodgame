import { Chunk, CHUNK_SIZE, TILE_SIZE, type BiomeId } from "./Chunk";
import type { Vector2 } from "../entities/Player";

const WORLD_RADIUS = 4; // generates 9x9 chunks around origin

const BIOME_RING: { radius: number; biome: BiomeId }[] = [
  { radius: 1, biome: "urban" },
  { radius: 2, biome: "suburban" },
  { radius: 3, biome: "industrial" },
  { radius: 4, biome: "rural" }
];

function hash(x: number, y: number): number {
  return Math.abs(Math.floor(Math.sin(x * 928371 + y * 123189) * 100000));
}

export class World {
  private readonly chunks = new Map<string, Chunk>();

  constructor() {
    this.generateInitialWorld();
  }

  private generateInitialWorld(): void {
    for (let cx = -WORLD_RADIUS; cx <= WORLD_RADIUS; cx += 1) {
      for (let cy = -WORLD_RADIUS; cy <= WORLD_RADIUS; cy += 1) {
        this.getOrCreateChunk(cx, cy);
      }
    }
  }

  private getOrCreateChunk(cx: number, cy: number): Chunk {
    const key = `${cx}:${cy}`;
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const seed = hash(cx, cy);
    const worldPosition: Vector2 = {
      x: cx * CHUNK_SIZE * TILE_SIZE,
      y: cy * CHUNK_SIZE * TILE_SIZE
    };
    const biome = this.pickBiome(cx, cy);
    const chunk = new Chunk({ id: key, biome, worldPosition, seed });
    this.chunks.set(key, chunk);
    return chunk;
  }

  private pickBiome(cx: number, cy: number): BiomeId {
    const distance = Math.max(Math.abs(cx), Math.abs(cy));
    for (const ring of BIOME_RING) {
      if (distance <= ring.radius) {
        return ring.biome;
      }
    }
    return "rural";
  }

  update(_dt: number): void {
    // placeholder for chunk streaming, POI updates, etc.
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2): void {
    const chunkX = Math.floor(playerPosition.x / (CHUNK_SIZE * TILE_SIZE));
    const chunkY = Math.floor(playerPosition.y / (CHUNK_SIZE * TILE_SIZE));

    for (let cx = chunkX - 2; cx <= chunkX + 2; cx += 1) {
      for (let cy = chunkY - 2; cy <= chunkY + 2; cy += 1) {
        const chunk = this.getOrCreateChunk(cx, cy);
        const offset: Vector2 = {
          x: playerPosition.x - (window.innerWidth / 2),
          y: playerPosition.y - (window.innerHeight / 2)
        };
        chunk.draw(ctx, offset);
      }
    }
  }

  constrainToWorld(position: Vector2, size: number): Vector2 {
    const limit = WORLD_RADIUS * CHUNK_SIZE * TILE_SIZE;
    return {
      x: Math.min(Math.max(position.x, -limit + size), limit - size),
      y: Math.min(Math.max(position.y, -limit + size), limit - size)
    };
  }
}
