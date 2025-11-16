import type { Inventory } from "./Inventory";
import type { PlacedItem } from "./GridInventory";
import { resolveItemDefinition, type ItemStack } from "./Item";
import type { EquipmentSlot, ItemDefinition } from "../data/ContentRegistry";

export interface EquipmentSnapshot {
  [slot: string]: string | null;
}

interface EquippedEntry {
  slot: EquipmentSlot;
  definition: ItemDefinition;
  stack: ItemStack;
}

export class EquipmentManager {
  private readonly equipped: Map<EquipmentSlot, EquippedEntry> = new Map();
  private readonly baseColumns: number;
  private readonly baseRows: number;
  private readonly baseWeight: number;
  private armorRating = 0;

  constructor(private readonly inventory: Inventory) {
    this.baseColumns = inventory.grid.columns;
    this.baseRows = inventory.grid.rows;
    this.baseWeight = inventory.weightLimitKg;
  }

  getArmorRating(): number {
    return this.armorRating;
  }

  getEquipped(): EquippedEntry[] {
    return [...this.equipped.values()];
  }

  getEquippedBySlot(slot: EquipmentSlot): EquippedEntry | null {
    return this.equipped.get(slot) ?? null;
  }

  equip(item: PlacedItem): { success: boolean; reason?: string } {
    const definition = item.definition;
    if (!definition.equipment) {
      return { success: false, reason: "Item cannot be equipped" };
    }
    const slot = definition.equipment.slot;
    const removed = this.inventory.removePlacedItem(item.id);
    if (!removed) {
      return { success: false, reason: "Failed to pick up item" };
    }
    const previous = this.equipped.get(slot);
    this.equipped.set(slot, { slot, definition, stack: { ...item.stack } });
    const resizeResult = this.recalculateInventory();
    if (!resizeResult.success) {
      this.equipped.delete(slot);
      if (previous) {
        this.equipped.set(slot, previous);
      }
      this.inventory.add(item.stack);
      return resizeResult;
    }
    if (previous) {
      this.inventory.add({ ...previous.stack });
    }
    return { success: true };
  }

  unequip(slot: EquipmentSlot): { success: boolean; reason?: string } {
    const entry = this.equipped.get(slot);
    if (!entry) {
      return { success: false, reason: "Slot empty" };
    }
    const addResult = this.inventory.add({ ...entry.stack });
    if (!addResult.success) {
      return { success: false, reason: "No space to unequip" };
    }
    this.equipped.delete(slot);
    this.recalculateInventory();
    return { success: true };
  }

  serialize(): EquipmentSnapshot {
    const snapshot: EquipmentSnapshot = {};
    this.equipped.forEach(entry => {
      snapshot[entry.slot] = entry.definition.id;
    });
    return snapshot;
  }

  load(snapshot: EquipmentSnapshot | undefined): void {
    this.equipped.clear();
    if (!snapshot) {
      this.recalculateInventory();
      return;
    }
    Object.entries(snapshot).forEach(([slot, itemId]) => {
      if (!itemId) {
        return;
      }
      const definition = resolveItemDefinition(itemId);
      if (!definition.equipment) {
        return;
      }
      this.equipped.set(slot as EquipmentSlot, {
        slot: slot as EquipmentSlot,
        definition,
        stack: {
          itemId,
          quantity: 1,
          condition: definition.durability_max,
          rotation: 0
        }
      });
    });
    this.recalculateInventory();
  }

  private recalculateInventory(): { success: boolean; reason?: string } {
    const capacity = this.getCapacityModifiers();
    const resized = this.inventory.resize(capacity.columns, capacity.rows);
    if (!resized.success) {
      return resized;
    }
    this.inventory.setWeightLimit(capacity.weightLimit);
    this.armorRating = capacity.armorRating;
    return { success: true };
  }

  private getCapacityModifiers(): { columns: number; rows: number; weightLimit: number; armorRating: number } {
    let columns = this.baseColumns;
    let rows = this.baseRows;
    let weightLimit = this.baseWeight;
    let armorRating = 0;

    this.equipped.forEach(entry => {
      const equipment = entry.definition.equipment!;
      columns += equipment.capacity_bonus?.columns ?? 0;
      rows += equipment.capacity_bonus?.rows ?? 0;
      weightLimit += equipment.weight_bonus_kg ?? 0;
      armorRating += equipment.armor_bonus ?? 0;
    });

    return {
      columns: Math.max(this.baseColumns, columns),
      rows: Math.max(this.baseRows, rows),
      weightLimit: Math.max(this.baseWeight, weightLimit),
      armorRating: Math.min(0.8, armorRating)
    };
  }
}
