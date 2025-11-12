import type { Inventory } from "../inventory/Inventory";
import type { ItemStack } from "../inventory/Item";

export class TransparentContainerHUD {
  private readonly element: HTMLDivElement;
  private readonly grid: HTMLDivElement;
  private readonly title: HTMLHeadingElement;

  constructor(label: string) {
    this.element = document.createElement("div");
    this.element.className = "transparent-container";
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-label", label);

    this.title = document.createElement("h2");
    this.title.innerText = label;
    this.title.className = "transparent-container__title";

    this.grid = document.createElement("div");
    this.grid.className = "transparent-container__grid";

    this.element.append(this.title, this.grid);
    document.body.append(this.element);
    this.hide();
  }

  syncFromInventory(inventory: Inventory, label?: string): void {
    if (label) {
      this.title.innerText = label;
    }
    const render = inventory.slots;
    this.grid.replaceChildren(...render.map(slot => this.renderSlot(slot.item)));
  }

  show(): void {
    this.element.style.display = "flex";
  }

  hide(): void {
    this.element.style.display = "none";
  }

  private renderSlot(item: ItemStack | null): HTMLDivElement {
    const slot = document.createElement("div");
    slot.className = "transparent-container__slot";
    if (!item) {
      slot.innerText = "";
      return slot;
    }
    slot.innerText = `${item.itemId} x${item.quantity}`;
    slot.setAttribute("data-condition", item.condition.toString());
    return slot;
  }
}
