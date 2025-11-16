import type { InputManager } from "../engine/Input";
import type { Inventory } from "../inventory/Inventory";
import { RecipeBook, type StationId } from "./RecipeBook";
import { CraftingStation, type CrafterProfile, type CraftingTaskState } from "./CraftingStation";
import { CraftingPanel } from "../ui/CraftingPanel";
import { UnifiedOverlay } from "../ui/UnifiedOverlay";

export class CraftingController {
  private readonly recipeBook = new RecipeBook();
  private readonly stations = new Map<StationId, CraftingStation>();
  private readonly panel: CraftingPanel;
  private readonly defaultCrafter: CrafterProfile;

  constructor(playerInventory: Inventory, _input: InputManager, overlay: UnifiedOverlay) {
    this.panel = new CraftingPanel({
      onRequestEnqueue: recipeId => this.enqueue(recipeId),
      onToggle: isOpen => {
        if (isOpen) {
          this.refreshPanel();
        }
      }
    });

    this.defaultCrafter = {
      id: "player",
      name: "Player",
      skills: {
        medicine: 1,
        mechanics: 1,
        electronics: 0
      }
    };

    this.registerStation({
      id: "hand",
      label: "Hand Crafting",
      input: playerInventory,
      output: playerInventory
    });

    this.registerStation({
      id: "workbench_t1",
      label: "Workbench T1",
      input: playerInventory,
      output: playerInventory
    });

    this.registerStation({
      id: "electronics_t3",
      label: "Electronics Bench T3",
      input: playerInventory,
      output: playerInventory
    });

    overlay.registerTab({
      id: "crafting",
      label: "Crafting",
      icon: "🛠️",
      hotkeys: ["toggle-crafting"],
      element: this.panel.getElement(),
      onOpen: () => {
        this.panel.open();
        this.refreshPanel();
      },
      onClose: () => this.panel.close()
    });

    this.refreshPanel();
  }

  update(delta: number): void {
    this.stations.forEach(station => station.update(delta));
    if (this.panel.isOpen()) {
      this.refreshPanel();
    }
  }

  unlockBlueprint(blueprintId: string): void {
    this.recipeBook.unlockBlueprint(blueprintId);
    this.refreshPanel();
  }

  getQueueForStation(stationId: StationId): CraftingTaskState[] {
    const station = this.stations.get(stationId);
    if (!station) {
      return [];
    }
    return station.getQueueState();
  }

  private registerStation(config: { id: StationId; label: string; input: Inventory; output: Inventory }): void {
    const station = new CraftingStation({
      id: config.id,
      label: config.label,
      inputInventory: config.input,
      outputInventory: config.output
    });
    this.stations.set(config.id, station);
  }

  private enqueue(recipeId: string): { success: boolean; reason?: string } {
    const recipe = this.recipeBook.getRecipe(recipeId);
    if (!recipe) {
      return { success: false, reason: "Recipe not found" };
    }

    if (!this.recipeBook.isRecipeUnlocked(recipe)) {
      return { success: false, reason: "Blueprint locked" };
    }

    const station = this.stations.get(recipe.station);
    if (!station) {
      return { success: false, reason: "Station unavailable" };
    }

    const crafter = this.defaultCrafter;
    const skillCheck = Object.entries(recipe.skill_req ?? {}).every(([skill, level]) => (crafter.skills[skill] ?? 0) >= level);
    if (!skillCheck) {
      return { success: false, reason: "Skill level too low" };
    }

    const enqueueResult = station.enqueue(recipe, crafter);
    if (!enqueueResult.success) {
      return { success: false, reason: enqueueResult.reason ?? "Missing ingredients or storage" };
    }

    this.refreshPanel();
    return { success: true };
  }

  private refreshPanel(): void {
    const stations = [...this.stations.values()].map(station => ({
      id: station.id,
      label: station.label,
      queue: station.getQueueState()
    }));
    const recipes = this.recipeBook
      .getAll()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.panel.sync({
      stations,
      recipes,
      unlockedChecker: recipe => this.recipeBook.isRecipeUnlocked(recipe)
    });
  }
}
