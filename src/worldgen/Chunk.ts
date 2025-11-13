import type { Vector2 } from "../entities/Player";

export const TILE_SIZE = 64;
export const CHUNK_SIZE = 16;

export type BiomeId =
  | "urban_core"
  | "suburban"
  | "industrial"
  | "rural"
  | "highway"
  | "military_zone"
  | "wasteland";

export interface ChunkPoi {
  id: string;
  typeId: string;
  name: string;
  category: string;
  worldPosition: Vector2;
  size: [number, number];
  lootTable: string;
  respawnDays: [number, number];
  alarm: "silent" | "active";
  isMajor: boolean;
  zombieDensity: number;
  templateId?: string;
}

export interface ChunkDefinition {
  id: string;
  biome: BiomeId;
  worldPosition: Vector2;
  seed: number;
  palette: string[];
  pois: ChunkPoi[];
}

export class Chunk {
  tiles: number[][];

  constructor(readonly definition: ChunkDefinition) {
    this.tiles = this.generateTiles(definition.seed);
  }

  private generateTiles(seed: number): number[][] {
    const tiles: number[][] = [];
    const base = (seed % 7) / 7;
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      tiles[x] = [];
      for (let y = 0; y < CHUNK_SIZE; y += 1) {
        const noise = (Math.sin(seed + x * 13 + y * 17) + 1) / 2;
        const height = Math.floor((base + noise) * 3) % 3;
        tiles[x][y] = height;
      }
    }
    return tiles;
  }

  draw(ctx: CanvasRenderingContext2D, offset: Vector2): void {
    const colors = this.definition.palette.length ? this.definition.palette : ["#0f172a"];
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      for (let y = 0; y < CHUNK_SIZE; y += 1) {
        const tileValue = this.tiles[x][y];
        const worldX = this.definition.worldPosition.x + x * TILE_SIZE;
        const worldY = this.definition.worldPosition.y + y * TILE_SIZE;
        const screenX = worldX - offset.x;
        const screenY = worldY - offset.y;

        ctx.fillStyle = colors[tileValue % colors.length];
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }

    this.drawPois(ctx, offset);
  }

  private drawPois(ctx: CanvasRenderingContext2D, offset: Vector2): void {
    const categoryColors: Record<string, string> = {
      residential: "rgba(248, 250, 252, 0.6)",
      commercial: "rgba(248, 181, 0, 0.65)",
      industrial: "rgba(34, 197, 94, 0.6)",
      military: "rgba(248, 113, 113, 0.65)",
      highway: "rgba(96, 165, 250, 0.6)",
      special: "rgba(251, 191, 36, 0.7)",
      faction: "rgba(191, 219, 254, 0.7)"
    };

    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = "12px Inter, system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    for (const poi of this.definition.pois) {
      const color = categoryColors[poi.category] ?? "rgba(255, 255, 255, 0.6)";
      const screenX = poi.worldPosition.x - offset.x;
      const screenY = poi.worldPosition.y - offset.y;
      const width = poi.size[0] * TILE_SIZE;
      const height = poi.size[1] * TILE_SIZE;

      ctx.strokeStyle = color;
      ctx.strokeRect(screenX, screenY, width, height);
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(screenX, screenY - 16, width, 16);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(poi.name, screenX + 4, screenY - 14);
    }

    ctx.restore();
  }
}
