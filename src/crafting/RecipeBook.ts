import { content } from "../data";
import type { RecipeDefinition } from "../data/ContentRegistry";

export type StationId = RecipeDefinition["station"];

export class RecipeBook {
  private readonly recipes = new Map<string, RecipeDefinition>();
  private readonly unlockedBlueprints = new Set<string>();

  constructor() {
    for (const recipe of content.recipes) {
      this.recipes.set(recipe.id, recipe);
    }
  }

  getRecipe(id: string): RecipeDefinition | undefined {
    return this.recipes.get(id);
  }

  getAll(): RecipeDefinition[] {
    return [...this.recipes.values()];
  }

  unlockBlueprint(blueprintId: string): void {
    this.unlockedBlueprints.add(blueprintId);
  }

  isRecipeUnlocked(recipe: RecipeDefinition): boolean {
    if (!recipe.blueprint_required) {
      return true;
    }
    return this.unlockedBlueprints.has(recipe.blueprint_required);
  }

  getAvailableForStation(station: StationId): RecipeDefinition[] {
    return this.getAll().filter(recipe => recipe.station === station && this.isRecipeUnlocked(recipe));
  }
}
