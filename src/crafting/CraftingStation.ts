import type { RecipeDefinition } from "../data/ContentRegistry";
import type { Inventory } from "../inventory/Inventory";
import type { StationId } from "./RecipeBook";

export interface CrafterProfile {
  id: string;
  name: string;
  skills: Record<string, number>;
}

export interface CraftingTaskState {
  id: string;
  recipeId: string;
  recipeName: string;
  remainingSeconds: number;
  totalSeconds: number;
  status: "queued" | "active" | "completed";
  assignedCrafter: CrafterProfile | null;
}

let nextTaskId = 0;

export interface CraftingStationOptions {
  id: StationId;
  label: string;
  inputInventory: Inventory;
  outputInventory: Inventory;
}

interface InternalTask {
  id: string;
  recipe: RecipeDefinition;
  remainingSeconds: number;
  totalSeconds: number;
  assignedCrafter: CrafterProfile | null;
  status: "queued" | "active" | "completed";
}

export class CraftingStation {
  readonly id: StationId;
  readonly label: string;
  private readonly inputInventory: Inventory;
  private readonly outputInventory: Inventory;

  private readonly queue: InternalTask[] = [];
  private currentTask: InternalTask | null = null;
  private readonly completed: InternalTask[] = [];

  constructor(options: CraftingStationOptions) {
    this.id = options.id;
    this.label = options.label;
    this.inputInventory = options.inputInventory;
    this.outputInventory = options.outputInventory;
  }

  enqueue(recipe: RecipeDefinition, crafter: CrafterProfile | null): boolean {
    const meetsSkill = Object.entries(recipe.skill_req ?? {}).every(([skill, requiredLevel]) => {
      const level = crafter?.skills[skill] ?? 0;
      return level >= requiredLevel;
    });
    if (!meetsSkill) {
      return false;
    }

    const requirements = recipe.inputs.map(input => ({ itemId: input.item, quantity: input.qty }));
    const consumed = this.inputInventory.consumeItems(requirements);
    if (!consumed) {
      return false;
    }

    const task: InternalTask = {
      id: `task_${nextTaskId += 1}`,
      recipe,
      remainingSeconds: recipe.time_seconds,
      totalSeconds: recipe.time_seconds,
      assignedCrafter: crafter,
      status: "queued"
    };
    this.queue.push(task);
    return true;
  }

  update(deltaSeconds: number): void {
    if (!this.currentTask) {
      this.currentTask = this.queue.shift() ?? null;
      if (this.currentTask) {
        this.currentTask.status = "active";
      }
    }

    if (!this.currentTask) {
      return;
    }

    this.currentTask.remainingSeconds = Math.max(0, this.currentTask.remainingSeconds - deltaSeconds);

    if (this.currentTask.remainingSeconds <= 0) {
      this.currentTask.status = "completed";
      const output = this.currentTask.recipe.output;
      const added = this.outputInventory.add({
        itemId: output.item,
        quantity: output.qty,
        condition: output.condition,
        rotation: 0
      });

      if (!added) {
        console.warn(`Output inventory full for ${output.item}. Item dropped.`);
      }

      this.completed.push(this.currentTask);
      if (this.completed.length > 10) {
        this.completed.shift();
      }
      this.currentTask = null;
    }
  }

  getQueueState(): CraftingTaskState[] {
    const snapshot: InternalTask[] = [];
    if (this.currentTask) {
      snapshot.push(this.currentTask);
    }
    snapshot.push(...this.queue);
    snapshot.push(...this.completed.slice(-5));

    return snapshot.map(task => ({
      id: task.id,
      recipeId: task.recipe.id,
      recipeName: task.recipe.name,
      remainingSeconds: task.remainingSeconds,
      totalSeconds: task.totalSeconds,
      status: task.status,
      assignedCrafter: task.assignedCrafter
    }));
  }
}
