export type ItemTag =
  | "weapon"
  | "food"
  | "medical"
  | "material"
  | "vehicle-part"
  | "quest";

export interface ItemDefinition {
  id: string;
  name: string;
  size: [number, number];
  weight: number;
  stackSize: number;
  tags: ItemTag[];
}

export interface ItemStack {
  definition: ItemDefinition;
  quantity: number;
  condition: number;
}

export const DEMO_ITEMS: ItemDefinition[] = [
  {
    id: "item_canned_food",
    name: "Canned Food",
    size: [1, 1],
    weight: 0.5,
    stackSize: 4,
    tags: ["food"]
  },
  {
    id: "item_repair_kit",
    name: "Basic Repair Kit",
    size: [2, 1],
    weight: 2,
    stackSize: 1,
    tags: ["material", "vehicle-part"]
  },
  {
    id: "item_bandage",
    name: "Sterile Bandage",
    size: [1, 2],
    weight: 0.2,
    stackSize: 6,
    tags: ["medical"]
  }
];

export function createStack(id: string, quantity = 1, condition = 100): ItemStack {
  const definition = DEMO_ITEMS.find(item => item.id === id);
  if (!definition) {
    throw new Error(`Unknown item: ${id}`);
  }
  return { definition, quantity, condition };
}
