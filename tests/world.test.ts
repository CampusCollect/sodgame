import { describe, expect, it } from "vitest";
import { World } from "../src/worldgen/World";

describe("World", () => {
  it("generates chunks deterministically per coordinate", () => {
    const world = new World();
    // Access internal method via public draw to ensure chunk caching occurs
    // @ts-expect-error accessing private map for deterministic check
    const first = world["getOrCreateChunk"].call(world, 0, 0);
    // @ts-expect-error same
    const second = world["getOrCreateChunk"].call(world, 0, 0);
    expect(second.tiles).toEqual(first.tiles);
  });
});
