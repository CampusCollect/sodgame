import type { RecipeDefinition } from "../data/ContentRegistry";
import type { CraftingTaskState } from "../crafting/CraftingStation";
import type { StationId } from "../crafting/RecipeBook";

interface CraftingPanelOptions {
  onRequestEnqueue: (recipeId: string) => { success: boolean; reason?: string };
  onToggle?: (open: boolean) => void;
}

interface StationViewState {
  id: StationId;
  label: string;
  queue: CraftingTaskState[];
}

interface CraftingPanelSyncState {
  stations: StationViewState[];
  recipes: RecipeDefinition[];
  unlockedChecker: (recipe: RecipeDefinition) => boolean;
}

export class CraftingPanel {
  private readonly root: HTMLDivElement;
  private readonly stationSelect: HTMLSelectElement;
  private readonly recipeList: HTMLDivElement;
  private readonly queueList: HTMLDivElement;
  private readonly statusLine: HTMLDivElement;
  private panelOpen = false;
  private currentStation: StationId | null = null;
  private lastSync: CraftingPanelSyncState | null = null;

  constructor(private readonly options: CraftingPanelOptions) {
    this.root = document.createElement("div");
    this.root.className = "crafting-panel hidden";

    const header = document.createElement("div");
    header.className = "crafting-panel__header";
    header.innerText = "Crafting";

    this.stationSelect = document.createElement("select");
    this.stationSelect.className = "crafting-panel__station";
    this.stationSelect.addEventListener("change", () => {
      this.currentStation = this.stationSelect.value as StationId;
      this.render();
    });

    this.recipeList = document.createElement("div");
    this.recipeList.className = "crafting-panel__recipes";

    this.queueList = document.createElement("div");
    this.queueList.className = "crafting-panel__queue";

    this.statusLine = document.createElement("div");
    this.statusLine.className = "crafting-panel__status";

    this.root.append(header, this.stationSelect, this.recipeList, this.queueList, this.statusLine);
  }

  getElement(): HTMLDivElement {
    return this.root;
  }

  open(): void {
    this.setOpen(true);
  }

  close(): void {
    this.setOpen(false);
  }

  isOpen(): boolean {
    return this.panelOpen;
  }

  private setOpen(next: boolean): void {
    this.panelOpen = next;
    this.root.classList.toggle("hidden", !next);
    this.options.onToggle?.(this.panelOpen);
    if (this.panelOpen) {
      this.statusLine.textContent = "";
      this.statusLine.classList.remove("crafting-panel__status--error");
    }
  }

  sync(state: CraftingPanelSyncState): void {
    this.lastSync = state;
    this.statusLine.textContent = "";
    this.statusLine.classList.remove("crafting-panel__status--error");
    this.refreshStationOptions(state.stations);
    if (!this.currentStation && state.stations.length > 0) {
      this.currentStation = state.stations[0].id;
    }
    if (this.panelOpen) {
      this.render();
    }
  }

  private refreshStationOptions(stations: StationViewState[]): void {
    const previous = this.stationSelect.value as StationId;
    this.stationSelect.replaceChildren();
    for (const station of stations) {
      const option = document.createElement("option");
      option.value = station.id;
      option.textContent = station.label;
      this.stationSelect.append(option);
    }
    if (stations.length > 0) {
      const target = this.currentStation ?? previous ?? stations[0].id;
      this.stationSelect.value = target;
      this.currentStation = target as StationId;
    }
  }

  private render(): void {
    if (!this.lastSync || !this.currentStation) {
      return;
    }

    const { stations, recipes, unlockedChecker } = this.lastSync;
    const station = stations.find(s => s.id === this.currentStation);
    if (!station) {
      return;
    }

    this.renderRecipes(recipes.filter(recipe => recipe.station === station.id), unlockedChecker);
    this.renderQueue(station.queue);
  }

  private renderRecipes(recipes: RecipeDefinition[], unlockedChecker: (recipe: RecipeDefinition) => boolean): void {
    this.recipeList.replaceChildren();
    if (recipes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "crafting-panel__empty";
      empty.innerText = "No recipes for this station.";
      this.recipeList.append(empty);
      return;
    }

    for (const recipe of recipes) {
      const card = document.createElement("div");
      card.className = "crafting-panel__recipe";

      const title = document.createElement("h3");
      title.textContent = recipe.name;
      card.append(title);

      const requirements = document.createElement("ul");
      requirements.className = "crafting-panel__requirements";
      for (const input of recipe.inputs) {
        const item = document.createElement("li");
        item.textContent = `${input.qty} × ${input.item}`;
        requirements.append(item);
      }
      card.append(requirements);

      const skillLine = document.createElement("div");
      skillLine.className = "crafting-panel__skills";
      const skills = Object.entries(recipe.skill_req ?? {});
      skillLine.textContent = skills.length > 0 ? skills.map(([skill, level]) => `${skill} ${level}`).join(", ") : "No skill requirement";
      card.append(skillLine);

      const footer = document.createElement("div");
      footer.className = "crafting-panel__footer";
      const button = document.createElement("button");
      button.className = "crafting-panel__enqueue";
      button.textContent = unlockedChecker(recipe) ? `Craft (${recipe.time_seconds}s)` : "Locked";
      button.disabled = !unlockedChecker(recipe);
      button.addEventListener("click", () => this.handleEnqueue(recipe.id));
      footer.append(button);

      card.append(footer);
      this.recipeList.append(card);
    }
  }

  private renderQueue(queue: CraftingTaskState[]): void {
    this.queueList.replaceChildren();
    const heading = document.createElement("h4");
    heading.textContent = "Queue";
    this.queueList.append(heading);

    if (queue.length === 0) {
      const empty = document.createElement("p");
      empty.className = "crafting-panel__empty";
      empty.innerText = "Queue is empty.";
      this.queueList.append(empty);
      return;
    }

    for (const task of queue) {
      const row = document.createElement("div");
      row.className = "crafting-panel__queue-item";
      const progress = task.status === "completed" ? 1 : 1 - task.remainingSeconds / task.totalSeconds;
      const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
      let statusLabel = task.status;
      if (task.status === "blocked") {
        statusLabel = task.blockedReason ?? "Blocked";
        row.dataset.status = "blocked";
      } else {
        row.dataset.status = task.status;
      }
      row.innerHTML = `<strong>${task.recipeName}</strong><span>${statusLabel} – ${pct}%</span>`;
      this.queueList.append(row);
    }
  }

  private handleEnqueue(recipeId: string): void {
    const result = this.options.onRequestEnqueue(recipeId);
    if (!result.success) {
      this.statusLine.textContent = result.reason ?? "Unable to craft.";
      this.statusLine.classList.add("crafting-panel__status--error");
    } else {
      this.statusLine.textContent = "Added to queue.";
      this.statusLine.classList.remove("crafting-panel__status--error");
    }
  }
}
