import { content } from "../data";
import { TILE_SIZE } from "../worldgen/Chunk";
import type { Vector2 } from "../entities/Player";
import type { Inventory } from "../inventory/Inventory";
import type { StructureDefinition } from "../data/ContentRegistry";

export interface PlacedStructure {
  id: string;
  definition: StructureDefinition;
  tilePosition: { x: number; y: number };
  worldPosition: Vector2;
  size: [number, number];
  powered: boolean;
}

export interface PowerSummary {
  availableKw: number;
  consumptionKw: number;
  deficitKw: number;
}

export interface PlacementResult {
  success: boolean;
  error?: string;
  structure?: PlacedStructure;
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class BuildingManager {
  private readonly structures = new Map<string, StructureDefinition>();
  private placed: PlacedStructure[] = [];
  private nextId = 1;
  private power: PowerSummary = { availableKw: 0, consumptionKw: 0, deficitKw: 0 };

  constructor() {
    content.structures.forEach(def => this.structures.set(def.id, def));
  }

  getDefinitions(): StructureDefinition[] {
    return [...this.structures.values()];
  }

  getPlaced(): PlacedStructure[] {
    return this.placed;
  }

  getPowerSummary(): PowerSummary {
    return this.power;
  }

  getDefinition(structureId: string): StructureDefinition | undefined {
    return this.structures.get(structureId);
  }

  canAfford(structureId: string, inventory: Inventory): boolean {
    const def = this.structures.get(structureId);
    if (!def) return false;
    const requirements = this.toRequirements(def);
    return inventory.hasItems(requirements);
  }

  canPlace(structureId: string, tilePosition: { x: number; y: number }): boolean {
    const def = this.structures.get(structureId);
    if (!def) return false;
    const targetRect = { x: tilePosition.x, y: tilePosition.y, w: def.size[0], h: def.size[1] };
    return !this.placed.some(existing => {
      const rect = {
        x: existing.tilePosition.x,
        y: existing.tilePosition.y,
        w: existing.size[0],
        h: existing.size[1]
      };
      return rectsOverlap(rect, targetRect);
    });
  }

  placeStructure(
    structureId: string,
    tilePosition: { x: number; y: number },
    inventory: Inventory
  ): PlacementResult {
    const definition = this.structures.get(structureId);
    if (!definition) {
      return { success: false, error: "Unknown structure" };
    }
    if (!this.canPlace(structureId, tilePosition)) {
      return { success: false, error: "Area occupied" };
    }
    const requirements = this.toRequirements(definition);
    if (!inventory.hasItems(requirements)) {
      return { success: false, error: "Missing materials" };
    }
    if (!inventory.consumeItems(requirements)) {
      return { success: false, error: "Failed to consume materials" };
    }

    const tile = { x: tilePosition.x, y: tilePosition.y };
    const worldPosition: Vector2 = {
      x: tile.x * TILE_SIZE,
      y: tile.y * TILE_SIZE
    };
    const placed: PlacedStructure = {
      id: `structure_${this.nextId++}`,
      definition,
      tilePosition: tile,
      worldPosition,
      size: definition.size,
      powered: true
    };
    this.placed = [...this.placed, placed];
    this.recomputePower();
    return { success: true, structure: placed };
  }

  private toRequirements(def: StructureDefinition): { itemId: string; quantity: number }[] {
    return Object.entries(def.cost).map(([itemId, quantity]) => ({ itemId, quantity }));
  }

  private recomputePower(): void {
    const available = this.placed.reduce((total, structure) => {
      return total + (structure.definition.power_output_kw ?? 0);
    }, 0);
    const consumers = this.placed.filter(placed => (placed.definition.power_required_kw ?? 0) > 0);
    const totalConsumption = consumers.reduce((total, structure) => {
      return total + (structure.definition.power_required_kw ?? 0);
    }, 0);

    let remaining = available;
    this.placed = this.placed.map(placed => {
      const required = placed.definition.power_required_kw ?? 0;
      if (required <= 0) {
        return { ...placed, powered: true };
      }
      if (remaining >= required) {
        remaining -= required;
        return { ...placed, powered: true };
      }
      return { ...placed, powered: false };
    });

    this.power = {
      availableKw: Number(available.toFixed(2)),
      consumptionKw: Number(totalConsumption.toFixed(2)),
      deficitKw: Number(Math.max(0, totalConsumption - available).toFixed(2))
    };
  }
}
