import type { ItemDefinition } from "../data/ContentRegistry";
import type { ItemStack } from "./Item";

export interface GridSlot {
  item: ItemStack | null;
}

export class GridInventory {
  readonly columns: number;
  readonly rows: number;
  readonly slots: GridSlot[];

  constructor(columns: number, rows: number) {
    this.columns = columns;
    this.rows = rows;
    this.slots = Array.from({ length: columns * rows }, () => ({ item: null }));
  }

  canFit(item: ItemDefinition, position: { x: number; y: number }, rotated = false): boolean {
    const width = rotated ? item.size[1] : item.size[0];
    const height = rotated ? item.size[0] : item.size[1];
    if (position.x + width > this.columns || position.y + height > this.rows) {
      return false;
    }
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const slotIndex = (position.y + y) * this.columns + (position.x + x);
        if (this.slots[slotIndex].item) {
          return false;
        }
      }
    }
    return true;
  }
}
