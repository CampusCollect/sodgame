import { resolveItemDefinition, type ItemStack } from "./Item";
import type { ItemDefinition } from "../data/ContentRegistry";

export interface GridPosition {
  x: number;
  y: number;
}

export interface PlacedItem {
  id: string;
  stack: ItemStack;
  definition: ItemDefinition;
  position: GridPosition;
  width: number;
  height: number;
  rotated: boolean;
}

interface GridCell {
  occupant: PlacedItem | null;
  isOrigin: boolean;
}

export interface GridRenderCell {
  stack: ItemStack | null;
  isOrigin: boolean;
  width: number;
  height: number;
  rotated: boolean;
}

export interface GridRenderState {
  columns: number;
  rows: number;
  cells: GridRenderCell[];
}

let nextPlacedId = 0;

function computeDimensions(definition: ItemDefinition, rotated: boolean): { width: number; height: number } {
  const [width, height] = definition.size;
  return rotated
    ? { width: height, height: width }
    : { width, height };
}

function cloneStackWithRotation(stack: ItemStack, rotation: 0 | 90): ItemStack {
  return {
    ...stack,
    rotation,
    attachments: stack.attachments ? { ...stack.attachments } : undefined
  };
}

export class GridInventory {
  readonly columns: number;
  readonly rows: number;
  private readonly cells: GridCell[];
  private readonly items = new Map<string, PlacedItem>();

  constructor(columns: number, rows: number) {
    this.columns = columns;
    this.rows = rows;
    this.cells = Array.from({ length: columns * rows }, () => ({ occupant: null, isOrigin: false }));
  }

  getPlacedItems(): PlacedItem[] {
    return [...this.items.values()];
  }

  countItemQuantity(itemId: string): number {
    return this.getPlacedItems()
      .filter(item => item.stack.itemId === itemId)
      .reduce((total, item) => total + item.stack.quantity, 0);
  }

  consumeItemQuantity(itemId: string, quantity: number): boolean {
    const available = this.countItemQuantity(itemId);
    if (available < quantity) {
      return false;
    }

    let remaining = quantity;
    const candidates = this.getPlacedItems()
      .filter(item => item.stack.itemId === itemId)
      .sort((a, b) => a.stack.quantity - b.stack.quantity);

    for (const item of candidates) {
      if (remaining <= 0) {
        break;
      }
      const take = Math.min(item.stack.quantity, remaining);
      item.stack.quantity -= take;
      remaining -= take;
      if (item.stack.quantity <= 0) {
        this.removeItem(item.id);
      }
    }

    return true;
  }

  tryStackItem(stack: ItemStack, definition: ItemDefinition): boolean {
    if (definition.stack_max <= 1) {
      return false;
    }
    const existing = this.getPlacedItems().find(item => item.stack.itemId === stack.itemId);
    if (!existing) {
      return false;
    }
    const total = existing.stack.quantity + stack.quantity;
    if (total <= definition.stack_max) {
      existing.stack.quantity = total;
      existing.stack.condition = Math.min(existing.stack.condition, stack.condition);
      return true;
    }
    const space = definition.stack_max - existing.stack.quantity;
    if (space <= 0) {
      return false;
    }
    existing.stack.quantity = definition.stack_max;
    existing.stack.condition = Math.min(existing.stack.condition, stack.condition);
    stack.quantity -= space;
    return false;
  }

  findPlacement(definition: ItemDefinition, allowRotation: boolean): { position: GridPosition; rotated: boolean } | null {
    const rotations: boolean[] = allowRotation ? [false, true] : [false];
    for (const rotated of rotations) {
      const { width, height } = computeDimensions(definition, rotated);
      for (let y = 0; y <= this.rows - height; y += 1) {
        for (let x = 0; x <= this.columns - width; x += 1) {
          if (this.canPlaceAt({ x, y }, width, height)) {
            return { position: { x, y }, rotated };
          }
        }
      }
    }
    return null;
  }

  addStack(stack: ItemStack, allowRotation = true): PlacedItem | null {
    const definition = resolveItemDefinition(stack.itemId);
    if (this.tryStackItem(stack, definition)) {
      return this.getPlacedItems().find(item => item.stack.itemId === stack.itemId) ?? null;
    }

    const placement = this.findPlacement(definition, allowRotation);
    if (!placement) {
      return null;
    }
    const rotation: 0 | 90 = placement.rotated ? 90 : 0;
    const preparedStack = cloneStackWithRotation(stack, rotation);
    const placed = this.placeStack(preparedStack, definition, placement.position, placement.rotated);
    return placed;
  }

  moveItem(id: string, position: GridPosition, rotated: boolean): boolean {
    const item = this.items.get(id);
    if (!item) {
      return false;
    }
    this.removeItem(id);
    const { width, height } = computeDimensions(item.definition, rotated);
    if (!this.canPlaceAt(position, width, height)) {
      // restore previous placement
      this.placeStack(item.stack, item.definition, item.position, item.rotated);
      return false;
    }
    item.stack.rotation = rotated ? 90 : 0;
    item.position = position;
    item.width = width;
    item.height = height;
    item.rotated = rotated;
    this.occupyCells(item);
    this.items.set(id, item);
    return true;
  }

  removeItem(id: string): PlacedItem | null {
    const existing = this.items.get(id);
    if (!existing) {
      return null;
    }
    this.clearCells(existing);
    this.items.delete(id);
    return existing;
  }

  removeAt(position: GridPosition): PlacedItem | null {
    const index = this.index(position.x, position.y);
    const cell = this.cells[index];
    if (!cell.occupant) {
      return null;
    }
    return this.removeItem(cell.occupant.id);
  }

  getRenderState(): GridRenderState {
    const cells: GridRenderCell[] = this.cells.map(cell => {
      if (!cell.occupant) {
        return { stack: null, isOrigin: false, width: 1, height: 1, rotated: false };
      }
      return {
        stack: cell.occupant.stack,
        isOrigin: cell.isOrigin,
        width: cell.occupant.width,
        height: cell.occupant.height,
        rotated: cell.occupant.rotated
      };
    });
    return { columns: this.columns, rows: this.rows, cells };
  }

  private placeStack(
    stack: ItemStack,
    definition: ItemDefinition,
    position: GridPosition,
    rotated: boolean
  ): PlacedItem {
    const id = `placed_${nextPlacedId += 1}`;
    const { width, height } = computeDimensions(definition, rotated);
    const placed: PlacedItem = {
      id,
      stack,
      definition,
      position,
      width,
      height,
      rotated
    };
    this.occupyCells(placed);
    this.items.set(id, placed);
    return placed;
  }

  private occupyCells(placed: PlacedItem): void {
    for (let y = 0; y < placed.height; y += 1) {
      for (let x = 0; x < placed.width; x += 1) {
        const index = this.index(placed.position.x + x, placed.position.y + y);
        const cell = this.cells[index];
        cell.occupant = placed;
        cell.isOrigin = x === 0 && y === 0;
      }
    }
  }

  private clearCells(placed: PlacedItem): void {
    for (let y = 0; y < placed.height; y += 1) {
      for (let x = 0; x < placed.width; x += 1) {
        const index = this.index(placed.position.x + x, placed.position.y + y);
        const cell = this.cells[index];
        cell.occupant = null;
        cell.isOrigin = false;
      }
    }
  }

  private canPlaceAt(position: GridPosition, width: number, height: number): boolean {
    if (position.x < 0 || position.y < 0 || position.x + width > this.columns || position.y + height > this.rows) {
      return false;
    }
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = this.index(position.x + x, position.y + y);
        if (this.cells[index].occupant) {
          return false;
        }
      }
    }
    return true;
  }

  private index(x: number, y: number): number {
    return y * this.columns + x;
  }
}
