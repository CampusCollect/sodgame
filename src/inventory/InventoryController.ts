import { Inventory } from "./Inventory";
import { InputManager } from "../engine/Input";
import { createStack, resolveItemDefinition } from "./Item";

export class InventoryController {
  private readonly container: HTMLDivElement;
  private readonly grid: HTMLDivElement;
  private readonly header: HTMLDivElement;

  constructor(private readonly inventory: Inventory, _input: InputManager) {
    this.container = document.createElement("div");
    this.container.className = "inventory-panel hidden";
    this.header = document.createElement("div");
    this.header.className = "inventory-panel__header";
    this.grid = document.createElement("div");
    this.grid.className = "inventory-grid";
    this.container.append(this.header, this.grid);
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
    const renderState = this.inventory.getRenderState();
    this.grid.style.setProperty("--cols", String(renderState.columns));
    this.grid.style.setProperty("--rows", String(renderState.rows));
    this.grid.innerHTML = "";
    this.header.innerText = `Weight ${this.inventory.getCurrentWeight().toFixed(1)} / ${this.inventory.weightLimitKg} kg`;

    for (let row = 0; row < renderState.rows; row += 1) {
      for (let col = 0; col < renderState.columns; col += 1) {
        const index = row * renderState.columns + col;
        const cellState = renderState.cells[index];
        if (cellState.stack && !cellState.isOrigin) {
          continue;
        }
        const cell = document.createElement("div");
        cell.className = "inventory-cell";
        cell.style.gridColumnStart = String(col + 1);
        cell.style.gridRowStart = String(row + 1);

        if (cellState.stack && cellState.isOrigin) {
          const definition = resolveItemDefinition(cellState.stack.itemId);
          cell.classList.add("inventory-cell--occupied");
          cell.style.gridColumnEnd = `span ${cellState.width}`;
          cell.style.gridRowEnd = `span ${cellState.height}`;
          cell.innerHTML = `<strong>${definition.name}</strong><span>x${cellState.stack.quantity}</span>`;
          cell.dataset.condition = cellState.stack.condition.toString();
          cell.dataset.weight = (definition.weight_kg * cellState.stack.quantity).toFixed(1);
          if (cellState.stack.rotation === 90) {
            cell.dataset.rotated = "true";
          }
        }

        this.grid.append(cell);
      }
    }
  }
}
