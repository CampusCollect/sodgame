import { content } from "../data";
import type { ItemDefinition as DataItemDefinition } from "../data/ContentRegistry";

export type ItemDefinition = DataItemDefinition;

export interface ItemStack {
  itemId: string;
  quantity: number;
  condition: number;
  /** Rotation of the item within grid inventories (0 = default, 90 = rotated clockwise). */
  rotation: 0 | 90;
  /** Optional attachment item ids mapped by slot name (e.g. optic, magazine). */
  attachments?: Record<string, string>;
  /** Remaining freshness hours for perishable items. */
  freshnessHoursRemaining?: number;
}

export function resolveItemDefinition(itemId: string): ItemDefinition {
  const definition = content.items.find(item => item.id === itemId);
  if (!definition) {
    throw new Error(`Unknown item: ${itemId}`);
  }
  return definition;
}

export function createStack(itemId: string, quantity = 1, condition = 100): ItemStack {
  resolveItemDefinition(itemId);
  return { itemId, quantity, condition };
}
