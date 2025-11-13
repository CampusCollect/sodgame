import type { Inventory } from "../inventory/Inventory";
import { resolveItemDefinition } from "../inventory/Item";

export class TransparentContainerHUD {
  private readonly element: HTMLDivElement;
  private readonly grid: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly actions: HTMLDivElement;
  private readonly hint: HTMLParagraphElement;

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

    this.actions = document.createElement("div");
    this.actions.className = "transparent-container__actions";
    this.actions.style.display = "none";

    this.hint = document.createElement("p");
    this.hint.className = "transparent-container__hint";
    this.hint.style.display = "none";

    this.element.append(this.title, this.grid, this.actions, this.hint);
    document.body.append(this.element);
    this.hide();
  }

  syncFromInventory(inventory: Inventory, label?: string): void {
    if (label) {
      this.title.innerText = label;
    }
    const renderState = inventory.getRenderState();
    this.grid.style.setProperty("--columns", renderState.columns.toString());
    this.grid.style.setProperty("--rows", renderState.rows.toString());
    this.grid.innerHTML = "";

    for (let row = 0; row < renderState.rows; row += 1) {
      for (let col = 0; col < renderState.columns; col += 1) {
        const index = row * renderState.columns + col;
        const cellState = renderState.cells[index];
        if (cellState.stack && !cellState.isOrigin) {
          continue;
        }
        const slot = document.createElement("div");
        slot.className = "transparent-container__slot";
        slot.style.gridColumnStart = String(col + 1);
        slot.style.gridRowStart = String(row + 1);

        if (cellState.stack && cellState.isOrigin) {
          const definition = resolveItemDefinition(cellState.stack.itemId);
          slot.style.gridColumnEnd = `span ${cellState.width}`;
          slot.style.gridRowEnd = `span ${cellState.height}`;
          slot.innerText = `${definition.name} x${cellState.stack.quantity}`;
          slot.setAttribute("data-condition", cellState.stack.condition.toFixed(0));
          if (cellState.stack.rotation === 90) {
            slot.dataset.rotated = "true";
          }
        }

        this.grid.append(slot);
      }
    }
  }

  setHint(text?: string): void {
    if (!text) {
      this.hint.style.display = "none";
      this.hint.innerText = "";
      return;
    }
    this.hint.style.display = "block";
    this.hint.innerText = text;
  }

  setActions(actions: { label: string; onClick: () => void; title?: string }[]): void {
    this.actions.innerHTML = "";
    if (actions.length === 0) {
      this.actions.style.display = "none";
      return;
    }
    this.actions.style.display = "flex";
    actions.forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "transparent-container__action";
      button.innerText = action.label;
      if (action.title) {
        button.title = action.title;
      }
      button.addEventListener("click", action.onClick);
      this.actions.append(button);
    });
  }

  show(): void {
    this.element.style.display = "flex";
  }

  hide(): void {
    this.element.style.display = "none";
  }

}
