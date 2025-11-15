import type { RecipeDefinition } from "../data/ContentRegistry";
import type { Inventory } from "../inventory/Inventory";
import type { StationId } from "./RecipeBook";
import type { ItemStack } from "../inventory/Item";

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
  status: "queued" | "active" | "completed" | "blocked";
  assignedCrafter: CrafterProfile | null;
  blockedReason?: string;
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
  status: "queued" | "active" | "completed" | "blocked";
  pendingOutput?: ItemStack;
  blockedReason?: string;
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

  enqueue(
    recipe: RecipeDefinition,
    crafter: CrafterProfile | null
  ): { success: boolean; reason?: string } {
    const meetsSkill = Object.entries(recipe.skill_req ?? {}).every(([skill, requiredLevel]) => {
      const level = crafter?.skills[skill] ?? 0;
      return level >= requiredLevel;
    });
    if (!meetsSkill) {
      return { success: false, reason: "Skill requirement not met" };
    }

    const requirements = recipe.inputs.map(input => ({ itemId: input.item, quantity: input.qty }));
    const consumed = this.inputInventory.consumeItems(requirements);
    if (!consumed) {
      return { success: false, reason: "Missing ingredients" };
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
    return { success: true };
  }

  update(deltaSeconds: number): void {
    if (this.currentTask && this.currentTask.status === "blocked") {
      const cleared = this.attemptPendingDelivery(this.currentTask);
      if (cleared) {
        this.completeCurrentTask();
      } else {
        return;
      }
    }

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
      this.handleTaskCompletion(this.currentTask);
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
      assignedCrafter: task.assignedCrafter,
      blockedReason: task.blockedReason
    }));
  }

  private handleTaskCompletion(task: InternalTask): void {
    const stack: ItemStack = {
      itemId: task.recipe.output.item,
      quantity: task.recipe.output.qty,
      condition: task.recipe.output.condition ?? 100,
      rotation: 0
    };
    const result = this.outputInventory.add({ ...stack });
    if (!result.success) {
      const remaining = Math.max(0, result.remainder);
      if (remaining > 0) {
        task.pendingOutput = { ...stack, quantity: remaining };
        task.status = "blocked";
        task.blockedReason = "Output storage full";
        return;
      }
    }
    this.completeCurrentTask();
  }

  private attemptPendingDelivery(task: InternalTask): boolean {
    if (!task.pendingOutput) {
      return true;
    }
    const attempt = { ...task.pendingOutput };
    const result = this.outputInventory.add(attempt);
    if (result.accepted <= 0) {
      task.blockedReason = "Output storage full";
      return false;
    }
    if (result.remainder > 0) {
      task.pendingOutput.quantity = result.remainder;
      task.blockedReason = "Output storage full";
      return false;
    }
    task.pendingOutput = undefined;
    task.blockedReason = undefined;
    return true;
  }

  private completeCurrentTask(): void {
    if (!this.currentTask) {
      return;
    }
    this.currentTask.status = "completed";
    this.currentTask.blockedReason = undefined;
    this.currentTask.pendingOutput = undefined;
    this.completed.push(this.currentTask);
    if (this.completed.length > 10) {
      this.completed.shift();
    }
    this.currentTask = null;
  }
}
