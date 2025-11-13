import { GridInventory, type GridRenderState, type PlacedItem } from "./GridInventory";
import { resolveItemDefinition, type ItemStack } from "./Item";

export interface InventoryOptions {
  columns: number;
  rows: number;
  weightLimitKg: number;
  allowRotation: boolean;
  label?: string;
}

const DEFAULT_OPTIONS: InventoryOptions = {
  columns: 6,
  rows: 8,
  weightLimitKg: 75,
  allowRotation: true,
  label: "Backpack"
};

export class Inventory {
  readonly grid: GridInventory;
  readonly weightLimitKg: number;
  readonly allowRotation: boolean;
  readonly label: string;
  isOpen = false;

  constructor(options: Partial<InventoryOptions> = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options } satisfies InventoryOptions;
    this.grid = new GridInventory(config.columns, config.rows);
    this.weightLimitKg = config.weightLimitKg;
    this.allowRotation = config.allowRotation;
    this.label = config.label ?? DEFAULT_OPTIONS.label;
  }

  add(stack: ItemStack): boolean {
    const definition = resolveItemDefinition(stack.itemId);
    if (!this.hasCapacityFor(definition.weight_kg * stack.quantity)) {
      return false;
    }
    const clone: ItemStack = { ...stack };
    const placed = this.grid.addStack(clone, this.allowRotation);
    if (!placed) {
      return false;
    }
    return true;
  }

  removeAt(position: { x: number; y: number }): PlacedItem | null {
    return this.grid.removeAt(position);
  }

  getPlacedItems(): PlacedItem[] {
    return this.grid.getPlacedItems();
  }

  getQuantity(itemId: string): number {
    return this.grid.countItemQuantity(itemId);
  }

  hasItems(requirements: { itemId: string; quantity: number }[]): boolean {
    return requirements.every(req => this.grid.countItemQuantity(req.itemId) >= req.quantity);
  }

  consumeItems(requirements: { itemId: string; quantity: number }[]): boolean {
    if (!this.hasItems(requirements)) {
      return false;
    }
    for (const req of requirements) {
      this.grid.consumeItemQuantity(req.itemId, req.quantity);
    }
    return true;
  }

  getCurrentWeight(): number {
    return this.grid
      .getPlacedItems()
      .reduce((total, item) => total + item.definition.weight_kg * item.stack.quantity, 0);
  }

  getRemainingCapacity(): number {
    return Math.max(0, this.weightLimitKg - this.getCurrentWeight());
  }

  getRenderState(): GridRenderState {
    return this.grid.getRenderState();
  }

  private hasCapacityFor(weight: number): boolean {
    return this.getCurrentWeight() + weight <= this.weightLimitKg;
  }
}

export type InventoryRenderState = GridRenderState;
