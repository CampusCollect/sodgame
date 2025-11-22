import { Inventory } from "./Inventory";
import type { InputManager } from "../engine/Input";
import { createStack, resolveItemDefinition } from "./Item";
import { UnifiedOverlay } from "../ui/UnifiedOverlay";
import { InventoryContextMenu } from "../ui/InventoryContextMenu";
import type { EquipmentManager } from "./EquipmentManager";
import type { PlacedItem } from "./GridInventory";
import type { EquipmentSlot } from "../data/ContentRegistry";

export class InventoryController {
  private readonly container: HTMLDivElement;
  private readonly grid: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly equipmentBar: HTMLDivElement;
  private readonly statusLine: HTMLDivElement;
  private readonly dragGhost: HTMLDivElement;
  private readonly contextMenu = new InventoryContextMenu();
  private dragState:
    | {
        itemId: string;
        rotated: boolean;
        offsetX: number;
        offsetY: number;
      }
    | null = null;
  private readonly equipSlots: { slot: EquipmentSlot; label: string; icon: string }[] = [
    { slot: "backpack", label: "Backpack", icon: "🎒" },
    { slot: "vest", label: "Vest", icon: "🦺" },
    { slot: "armor", label: "Body Armor", icon: "🛡️" },
    { slot: "helmet", label: "Helmet", icon: "⛑️" }
  ];

  constructor(
    private readonly inventory: Inventory,
    _input: InputManager,
    overlay: UnifiedOverlay,
    private readonly equipment: EquipmentManager,
    private readonly hooks: { onReloadRequest?: () => void } = {}
  ) {
    this.container = document.createElement("div");
    this.container.className = "inventory-panel hidden";
    this.header = document.createElement("div");
    this.header.className = "inventory-panel__header";
    this.statusLine = document.createElement("div");
    this.statusLine.className = "inventory-panel__status";
    this.equipmentBar = document.createElement("div");
    this.equipmentBar.className = "inventory-panel__equipment";
    this.grid = document.createElement("div");
    this.grid.className = "inventory-grid";
    this.container.append(this.header, this.statusLine, this.equipmentBar, this.grid);
    this.dragGhost = document.createElement("div");
    this.dragGhost.className = "inventory-drag hidden";
    document.body.append(this.dragGhost);

    this.grid.addEventListener("mousedown", event => this.handlePointerDown(event));
    this.grid.addEventListener("contextmenu", event => this.handleContextMenu(event));

    overlay.registerTab({
      id: "inventory",
      label: "Inventory",
      icon: "🎒",
      hotkeys: ["toggle-inventory"],
      element: this.container,
      onOpen: () => this.open(),
      onClose: () => this.close()
    });

    const seedStack = (id: string, qty: number): void => {
      const result = this.inventory.add(createStack(id, qty));
      if (!result.success) {
        console.warn(`Demo loadout item ${id} only partially loaded (accepted ${result.accepted})`);
      }
    };
    // demo loadout
    seedStack("item_canned_food", 2);
    seedStack("item_bandage", 1);
    seedStack("material_wood", 12);
    seedStack("material_metal", 10);
    seedStack("material_steel", 8);
    seedStack("item_component_circuit", 2);
    seedStack("item_pistol_9mm", 1);
    seedStack("item_melee_bat", 1);
    seedStack("item_ammo_9mm", 60);
    seedStack("item_ammo_762", 60);
    seedStack("item_grenade_frag", 2);
    seedStack("item_grenade_molotov", 1);
    seedStack("item_mod_reflex", 1);
    seedStack("item_mod_suppressor", 1);
    seedStack("item_mod_extmag", 1);
    seedStack("tool_lockpick", 2);
    seedStack("item_fuel_can", 1);
  }

  open(): void {
    if (this.inventory.isOpen) {
      return;
    }
    this.inventory.isOpen = true;
    this.container.classList.remove("hidden");
    this.render();
  }

  close(): void {
    if (!this.inventory.isOpen) {
      return;
    }
    this.inventory.isOpen = false;
    this.container.classList.add("hidden");
    this.contextMenu.hide();
    this.endDrag();
  }

  render(): void {
    const renderState = this.inventory.getRenderState();
    this.grid.style.setProperty("--cols", String(renderState.columns));
    this.grid.style.setProperty("--rows", String(renderState.rows));
    this.grid.innerHTML = "";
    this.header.innerText = `Weight ${this.inventory.getCurrentWeight().toFixed(1)} / ${this.inventory.weightLimitKg} kg • Capacity ${
      renderState.columns
    }×${renderState.rows}`;
    this.renderEquipment();

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
        cell.dataset.col = String(col);
        cell.dataset.row = String(row);

        if (cellState.stack && cellState.isOrigin) {
          const definition = resolveItemDefinition(cellState.stack.itemId);
          cell.classList.add("inventory-cell--occupied");
          cell.style.gridColumnEnd = `span ${cellState.width}`;
          cell.style.gridRowEnd = `span ${cellState.height}`;
          cell.innerHTML = `
            ${definition.icon ? `<span class="inventory-cell__icon">${definition.icon}</span>` : ""}
            <div class="inventory-cell__text">
              <strong>${definition.name}</strong>
              <span>x${cellState.stack.quantity}</span>
            </div>
          `;
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

  private renderEquipment(): void {
    this.equipmentBar.innerHTML = "";
    const armorPct = (this.equipment.getArmorRating() * 100).toFixed(0);
    const summary = document.createElement("p");
    summary.className = "inventory-panel__gear-summary";
    summary.innerText = `Armor ${armorPct}% • Slots ${this.inventory.grid.columns}×${this.inventory.grid.rows}`;
    this.equipmentBar.append(summary);

    const grid = document.createElement("div");
    grid.className = "inventory-panel__gear-grid";
    this.equipSlots.forEach(slot => {
      const card = document.createElement("div");
      card.className = "inventory-panel__gear-card";
      const equipped = this.equipment.getEquippedBySlot(slot.slot);
      card.innerHTML = `
        <span class="inventory-panel__gear-icon">${slot.icon}</span>
        <div>
          <strong>${slot.label}</strong>
          <p>${equipped ? equipped.definition.name : "Empty"}</p>
        </div>
      `;
      if (equipped) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Unequip";
        button.addEventListener("click", () => {
          const result = this.equipment.unequip(slot.slot);
          if (!result.success) {
            this.setStatus(result.reason ?? "Unable to unequip", true);
          } else {
            this.setStatus(`${slot.label} cleared`, false);
            this.render();
          }
        });
        card.append(button);
      }
      grid.append(card);
    });
    this.equipmentBar.append(grid);
  }

  private setStatus(message: string, error: boolean): void {
    this.statusLine.textContent = message;
    this.statusLine.dataset.state = error ? "error" : "ok";
  }

  private handlePointerDown(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>(".inventory-cell");
    if (!target || !target.dataset.col || !target.dataset.row) {
      return;
    }
    const col = Number(target.dataset.col);
    const row = Number(target.dataset.row);
    const placed = this.inventory.grid.getItemAt({ x: col, y: row });
    if (!placed) {
      return;
    }
    event.preventDefault();
    this.startDrag(placed, event);
  }

  private startDrag(placed: PlacedItem, event: MouseEvent): void {
    this.dragState = {
      itemId: placed.id,
      rotated: placed.rotated,
      offsetX: event.offsetX,
      offsetY: event.offsetY
    };
    this.dragGhost.textContent = placed.definition.name;
    this.dragGhost.classList.remove("hidden");
    this.updateDragGhost(event.clientX, event.clientY);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("keydown", this.handleKeyDownDuringDrag, { once: false });
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.dragState) {
      return;
    }
    this.updateDragGhost(event.clientX, event.clientY);
  };

  private handleMouseUp = (event: MouseEvent): void => {
    if (!this.dragState) {
      return;
    }
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(
      ".inventory-cell"
    );
    if (!dropTarget || !dropTarget.dataset.col || !dropTarget.dataset.row) {
      this.endDrag();
      this.render();
      return;
    }
    const col = Number(dropTarget.dataset.col);
    const row = Number(dropTarget.dataset.row);
    const result = this.inventory.grid.moveItem(this.dragState.itemId, { x: col, y: row }, this.dragState.rotated);
    if (!result) {
      this.setStatus("Not enough space", true);
    }
    this.endDrag();
    this.render();
  };

  private handleKeyDownDuringDrag = (event: KeyboardEvent): void => {
    if (!this.dragState) {
      return;
    }
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      this.dragState.rotated = !this.dragState.rotated;
      this.setStatus(this.dragState.rotated ? "Rotation set" : "Rotation cleared", false);
    }
  };

  private endDrag(): void {
    if (!this.dragState) {
      return;
    }
    this.dragState = null;
    this.dragGhost.classList.add("hidden");
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("keydown", this.handleKeyDownDuringDrag);
  }

  private updateDragGhost(x: number, y: number): void {
    this.dragGhost.style.left = `${x + 12}px`;
    this.dragGhost.style.top = `${y + 12}px`;
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    const target = (event.target as HTMLElement).closest<HTMLElement>(".inventory-cell");
    if (!target || !target.dataset.col || !target.dataset.row) {
      this.contextMenu.hide();
      return;
    }
    const col = Number(target.dataset.col);
    const row = Number(target.dataset.row);
    const placed = this.inventory.grid.getItemAt({ x: col, y: row });
    if (!placed) {
      this.contextMenu.hide();
      return;
    }
    const definition = placed.definition;
    const actions: { label: string; onSelect: () => void; description?: string }[] = [];
    actions.push({
      label: "Rotate",
      onSelect: () => {
        this.inventory.grid.moveItem(placed.id, placed.position, !placed.rotated);
        this.render();
      }
    });
    if (definition.tags.includes("ammo")) {
      actions.push({
        label: "Reload Active Weapon",
        onSelect: () => this.hooks.onReloadRequest?.(),
        description: "Consumes ammo from this stack"
      });
    }
    if (definition.equipment) {
      actions.push({
        label: `Equip ${definition.name}`,
        onSelect: () => {
          const result = this.equipment.equip(placed);
          if (!result.success) {
            this.setStatus(result.reason ?? "Unable to equip", true);
          } else {
            this.setStatus(`${definition.name} equipped`, false);
            this.render();
          }
        }
      });
    }
    actions.push({
      label: "Drop",
      onSelect: () => {
        this.inventory.removePlacedItem(placed.id);
        this.setStatus(`${definition.name} dropped`, false);
        this.render();
      }
    });
    this.contextMenu.show(event.clientX, event.clientY, actions);
  }
}
