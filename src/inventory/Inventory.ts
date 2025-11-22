import { GridInventory, type GridRenderState, type GridPosition, type PlacedItem } from "./GridInventory";
import { resolveItemDefinition, type ItemStack } from "./Item";

export interface InventoryOptions {
  columns: number;
  rows: number;
  weightLimitKg: number;
  allowRotation: boolean;
  label?: string;
}

export interface SerializedInventoryItem {
  stack: ItemStack;
  position: GridPosition;
  rotated: boolean;
}

export interface SerializedInventory {
  columns: number;
  rows: number;
  weightLimitKg: number;
  allowRotation: boolean;
  label: string;
  items: SerializedInventoryItem[];
}

export interface AddStackResult {
  success: boolean;
  accepted: number;
  remainder: number;
}

const DEFAULT_OPTIONS: InventoryOptions = {
  columns: 6,
  rows: 8,
  weightLimitKg: 75,
  allowRotation: true,
  label: "Backpack"
};

export class Inventory {
  grid: GridInventory;
  weightLimitKg: number;
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

  add(stack: ItemStack): AddStackResult {
    const definition = resolveItemDefinition(stack.itemId);
    const perUnitWeight = definition.weight_kg;
    const remainingCapacity = this.getRemainingCapacity();
    let allowedQuantity = stack.quantity;

    if (perUnitWeight > 0) {
      const maxByWeight = Math.floor(remainingCapacity / perUnitWeight);
      allowedQuantity = Math.min(stack.quantity, Math.max(0, maxByWeight));
    }

    if (allowedQuantity <= 0) {
      return { success: false, accepted: 0, remainder: stack.quantity };
    }

    const clone: ItemStack = { ...stack };
    clone.quantity = allowedQuantity;
    const beforeCount = this.grid.countItemQuantity(stack.itemId);
    const placed = this.grid.addStack(clone, this.allowRotation);
    const afterCount = this.grid.countItemQuantity(stack.itemId);
    const accepted = Math.max(0, afterCount - beforeCount);

    if (!placed && accepted === 0) {
      return { success: false, accepted: 0, remainder: stack.quantity };
    }

    const remainder = Math.max(0, stack.quantity - accepted);
    return { success: remainder === 0, accepted, remainder };
  }

  removeAt(position: { x: number; y: number }): PlacedItem | null {
    return this.grid.removeAt(position);
  }

  getPlacedItems(): PlacedItem[] {
    return this.grid.getPlacedItems();
  }

  removePlacedItem(id: string): ItemStack | null {
    const removed = this.grid.removeItem(id);
    return removed ? removed.stack : null;
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

  resize(columns: number, rows: number): { success: boolean; reason?: string } {
    if (columns === this.grid.columns && rows === this.grid.rows) {
      return { success: true };
    }
    const snapshot = this.serialize();
    const newGrid = new GridInventory(columns, rows);
    for (const item of snapshot.items) {
      const stack: ItemStack = {
        ...item.stack,
        attachments: item.stack.attachments ? { ...item.stack.attachments } : undefined
      };
      const ok = newGrid.restoreStack(stack, item.position, item.rotated);
      if (!ok) {
        return { success: false, reason: "Items do not fit in new layout" };
      }
    }
    this.grid = newGrid;
    return { success: true };
  }

  setWeightLimit(limitKg: number): void {
    this.weightLimitKg = limitKg;
  }

  serialize(): SerializedInventory {
    return {
      columns: this.grid.columns,
      rows: this.grid.rows,
      weightLimitKg: this.weightLimitKg,
      allowRotation: this.allowRotation,
      label: this.label,
      items: this.grid.getPlacedItems().map(item => ({
        stack: {
          ...item.stack,
          attachments: item.stack.attachments ? { ...item.stack.attachments } : undefined
        },
        position: { ...item.position },
        rotated: item.rotated
      }))
    };
  }

  load(state: SerializedInventory): void {
    if (state.columns !== this.grid.columns || state.rows !== this.grid.rows) {
      console.warn(
        `Inventory size mismatch during load (saved ${state.columns}x${state.rows}, current ${this.grid.columns}x${this.grid.rows})`
      );
    }
    this.grid.clear();
    state.items.forEach(item => {
      const stack: ItemStack = {
        ...item.stack,
        attachments: item.stack.attachments ? { ...item.stack.attachments } : undefined
      };
      const success = this.grid.restoreStack(stack, item.position, item.rotated);
      if (!success) {
        console.warn(`Failed to restore stack ${item.stack.itemId} at (${item.position.x},${item.position.y})`);
        this.add(stack);
      }
    });
  }

}

export type InventoryRenderState = GridRenderState;
