import { Chunk, CHUNK_SIZE, TILE_SIZE } from "./Chunk";
import type { Vector2 } from "../entities/Player";
import { ContentRegistry } from "../data/ContentRegistry";
import { BiomeManager } from "./BiomeManager";
import { POIManager } from "./POIManager";
import { RoadNetwork } from "./RoadNetwork";

const ACTIVE_RADIUS = 3;
const CACHE_RADIUS = 5;

function hash(x: number, y: number): number {
  return Math.abs(Math.floor(Math.sin(x * 928371 + y * 123189) * 100000));
}

interface ChunkCoordinates {
  x: number;
  y: number;
}

export class World {
  private readonly chunks = new Map<string, Chunk>();
  private readonly biomeManager: BiomeManager;
  private readonly poiManager: POIManager;
  private readonly roadNetwork: RoadNetwork;

  constructor() {
    const content = ContentRegistry.load();
    this.biomeManager = new BiomeManager(content.biomes);
    this.poiManager = new POIManager(content.poi_types);
    this.roadNetwork = new RoadNetwork();
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
    const biome = this.biomeManager.getBiome(cx, cy);
    const pois = this.poiManager.generateForChunk(cx, cy, biome, seed, worldPosition);
    const chunk = new Chunk({
      id: key,
      biome: biome.id,
      worldPosition,
      seed,
      palette: biome.palette,
      pois
    });
    this.chunks.set(key, chunk);
    this.roadNetwork.registerChunk(key, pois);
    return chunk;
  }

  update(_dt: number, playerPosition: Vector2): void {
    this.streamChunks(playerPosition);
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2, viewport: { width: number; height: number }): void {
    const chunkX = Math.floor(playerPosition.x / (CHUNK_SIZE * TILE_SIZE));
    const chunkY = Math.floor(playerPosition.y / (CHUNK_SIZE * TILE_SIZE));
    const offset: Vector2 = {
      x: playerPosition.x - viewport.width / 2,
      y: playerPosition.y - viewport.height / 2
    };

    for (let cx = chunkX - ACTIVE_RADIUS; cx <= chunkX + ACTIVE_RADIUS; cx += 1) {
      for (let cy = chunkY - ACTIVE_RADIUS; cy <= chunkY + ACTIVE_RADIUS; cy += 1) {
        const chunk = this.getOrCreateChunk(cx, cy);
        chunk.draw(ctx, offset);
      }
    }

    this.roadNetwork.draw(ctx, offset, viewport);
  }

  constrainToWorld(position: Vector2, _size: number): Vector2 {
    return { x: position.x, y: position.y };
  }

  private streamChunks(playerPosition: Vector2): void {
    const { x: chunkX, y: chunkY } = this.worldToChunk(playerPosition);

    for (let cx = chunkX - CACHE_RADIUS; cx <= chunkX + CACHE_RADIUS; cx += 1) {
      for (let cy = chunkY - CACHE_RADIUS; cy <= chunkY + CACHE_RADIUS; cy += 1) {
        this.getOrCreateChunk(cx, cy);
      }
    }

    for (const key of Array.from(this.chunks.keys())) {
      const coords = this.parseKey(key);
      if (Math.abs(coords.x - chunkX) > CACHE_RADIUS || Math.abs(coords.y - chunkY) > CACHE_RADIUS) {
        this.roadNetwork.removeChunk(key);
        this.chunks.delete(key);
      }
    }
  }

  private worldToChunk(position: Vector2): ChunkCoordinates {
    const chunkSize = CHUNK_SIZE * TILE_SIZE;
    return {
      x: Math.floor(position.x / chunkSize),
      y: Math.floor(position.y / chunkSize)
    };
  }

  private parseKey(key: string): ChunkCoordinates {
    const [x, y] = key.split(":").map((value) => parseInt(value, 10));
    return { x, y };
  }
}
