import { content } from "../data";
import type { LootItemRoll, LootTableDefinition } from "../data/ContentRegistry";
import { createStack, type ItemStack } from "../inventory/Item";

interface RollOptions {
  rolls?: number;
}

export class LootGenerator {
  private readonly tables = new Map<string, LootTableDefinition>(
    content.loot_tables.map(table => [table.id, table])
  );

  roll(tableId: string, options: RollOptions = {}): ItemStack[] {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`Missing loot table: ${tableId}`);
    }
    const rolls = Math.max(1, options.rolls ?? 3);
    const results: ItemStack[] = [];
    for (let i = 0; i < rolls; i += 1) {
      const pick = this.pick(table.items);
      if (!pick) {
        continue;
      }
      const quantity = pick.qty_range ? this.randomInt(pick.qty_range) : 1;
      const condition = pick.condition_range ? this.randomInt(pick.condition_range) : 100;
      const stack = createStack(pick.id, quantity, condition);
      results.push(stack);
    }
    return results;
  }

  private pick(items: LootItemRoll[]): LootItemRoll | null {
    const totalWeight = items.reduce((total, item) => total + item.weight, 0);
    if (totalWeight <= 0) {
      return null;
    }
    let roll = Math.random() * totalWeight;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) {
        return item;
      }
    }
    return items[items.length - 1] ?? null;
  }

  private randomInt([min, max]: [number, number]): number {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(Math.random() * (high - low + 1)) + low;
  }
}
