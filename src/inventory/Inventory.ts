import type { ItemStack } from "./Item";

const GRID_COLUMNS = 6;
const GRID_ROWS = 5;

export class InventorySlot {
  item: ItemStack | null = null;
}

export class Inventory {
  readonly slots: InventorySlot[] = Array.from({ length: GRID_COLUMNS * GRID_ROWS }, () => new InventorySlot());
  isOpen = false;

  add(stack: ItemStack): boolean {
    const empty = this.slots.find(slot => slot.item === null);
    if (!empty) {
      return false;
    }
    empty.item = stack;
    return true;
  }

  clear(): void {
    this.slots.forEach(slot => (slot.item = null));
  }
}

export interface InventoryRenderState {
  columns: number;
  rows: number;
  slots: (ItemStack | null)[];
}

export function toRenderState(inventory: Inventory): InventoryRenderState {
  return {
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: inventory.slots.map(slot => slot.item)
  };
}
