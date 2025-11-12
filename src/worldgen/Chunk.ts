import type { Vector2 } from "../entities/Player";

export const TILE_SIZE = 64;
export const CHUNK_SIZE = 16;

export type BiomeId = "urban" | "suburban" | "rural" | "industrial";

export interface ChunkDefinition {
  id: string;
  biome: BiomeId;
  worldPosition: Vector2;
  seed: number;
}

export class Chunk {
  tiles: number[][];

  constructor(readonly definition: ChunkDefinition) {
    this.tiles = this.generateTiles(definition.seed, definition.biome);
  }

  private generateTiles(seed: number, biome: BiomeId): number[][] {
    const tiles: number[][] = [];
    const base = (seed % 7) / 7;
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      tiles[x] = [];
      for (let y = 0; y < CHUNK_SIZE; y += 1) {
        const noise = (Math.sin(seed + x * 13 + y * 17) + 1) / 2;
        const height = Math.floor((base + noise) * 3) % 3;
        tiles[x][y] = biome === "urban" ? Math.max(1, height) : height;
      }
    }
    return tiles;
  }

  draw(ctx: CanvasRenderingContext2D, offset: Vector2): void {
    const { biome } = this.definition;
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      for (let y = 0; y < CHUNK_SIZE; y += 1) {
        const tileValue = this.tiles[x][y];
        const worldX = this.definition.worldPosition.x + x * TILE_SIZE;
        const worldY = this.definition.worldPosition.y + y * TILE_SIZE;
        const screenX = worldX - offset.x;
        const screenY = worldY - offset.y;

        ctx.fillStyle = getBiomeColor(biome, tileValue);
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

function getBiomeColor(biome: BiomeId, tile: number): string {
  const palette: Record<BiomeId, string[]> = {
    urban: ["#111827", "#1f2937", "#374151"],
    suburban: ["#0f172a", "#1e293b", "#334155"],
    industrial: ["#1f2937", "#374151", "#475569"],
    rural: ["#064e3b", "#047857", "#10b981"]
  };
  const colors = palette[biome];
  return colors[tile % colors.length];
}
