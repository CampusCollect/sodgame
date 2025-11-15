import { describe, expect, it } from "vitest";
import { Inventory } from "../src/inventory/Inventory";
import { CraftingStation, type CrafterProfile } from "../src/crafting/CraftingStation";
import type { RecipeDefinition } from "../src/data/ContentRegistry";
import { createStack } from "../src/inventory/Item";

describe("CraftingStation", () => {
  const crafter: CrafterProfile = {
    id: "tester",
    name: "Tester",
    skills: { mechanics: 3 }
  };

  const recipe: RecipeDefinition = {
    id: "recipe_test",
    name: "Test Plate",
    station: "hand",
    inputs: [{ item: "material_metal", qty: 1 }],
    output: { item: "material_metal", qty: 1, condition: 100 },
    time_seconds: 0.5,
    skill_req: { mechanics: 2 }
  };

  it("returns a descriptive reason when materials are missing", () => {
    const input = new Inventory({ columns: 2, rows: 2, weightLimitKg: 50, allowRotation: true, label: "Input" });
    const output = new Inventory({ columns: 2, rows: 2, weightLimitKg: 50, allowRotation: true, label: "Output" });
    const station = new CraftingStation({ id: "hand", label: "Hand", inputInventory: input, outputInventory: output });

    const result = station.enqueue(recipe, crafter);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("Missing ingredients");
  });

  it("blocks completed tasks until output storage frees up", () => {
    const input = new Inventory({ columns: 2, rows: 2, weightLimitKg: 50, allowRotation: true, label: "Input" });
    const output = new Inventory({ columns: 1, rows: 1, weightLimitKg: 5, allowRotation: true, label: "Output" });
    const station = new CraftingStation({ id: "hand", label: "Hand", inputInventory: input, outputInventory: output });

    input.add(createStack("material_metal", 2));
    output.add(createStack("item_canned_food", 1));

    const enqueue = station.enqueue(recipe, crafter);
    expect(enqueue.success).toBe(true);

    station.update(0.5);
    station.update(0.5);

    let queue = station.getQueueState();
    expect(queue[0]?.status).toBe("blocked");
    expect(queue[0]?.blockedReason).toBe("Output storage full");

    const blockingItem = output.getPlacedItems()[0];
    if (blockingItem) {
      output.removePlacedItem(blockingItem.id);
    }

    station.update(0);
    queue = station.getQueueState();
    expect(queue.some(task => task.status === "completed")).toBe(true);
  });
});
