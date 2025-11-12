import { Inventory, toRenderState } from "./Inventory";
import { InputManager } from "../engine/Input";
import { createStack, resolveItemDefinition } from "./Item";

export class InventoryController {
  private readonly container: HTMLDivElement;
  private readonly grid: HTMLDivElement;

  constructor(private readonly inventory: Inventory, _input: InputManager) {
    this.container = document.createElement("div");
    this.container.className = "inventory-panel hidden";
    this.grid = document.createElement("div");
    this.grid.className = "inventory-grid";
    this.container.append(this.grid);
    document.body.append(this.container);

    // demo loadout
    this.inventory.add(createStack("item_canned_food", 2));
    this.inventory.add(createStack("item_bandage", 1));
  }

  toggle(): void {
    this.inventory.isOpen = !this.inventory.isOpen;
    if (this.inventory.isOpen) {
      this.render();
      this.container.classList.remove("hidden");
    } else {
      this.container.classList.add("hidden");
    }
  }

  render(): void {
    const renderState = toRenderState(this.inventory);
    this.grid.style.setProperty("--cols", String(renderState.columns));
    this.grid.innerHTML = "";
    renderState.slots.forEach(slot => {
      const cell = document.createElement("div");
      cell.className = "inventory-cell";
      if (slot) {
        const definition = resolveItemDefinition(slot.itemId);
        cell.innerHTML = `<strong>${definition.name}</strong><span>x${slot.quantity}</span>`;
        cell.dataset.condition = slot.condition.toString();
      }
      this.grid.append(cell);
    });
  }
}
