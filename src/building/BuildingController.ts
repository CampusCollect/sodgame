import type { Player } from "../entities/Player";
import type { InputManager } from "../engine/Input";
import { TILE_SIZE } from "../worldgen/Chunk";
import { BuildingManager, type PlacedStructure, type SerializedStructurePlacement } from "./BuildingManager";
import { UnifiedOverlay } from "../ui/UnifiedOverlay";

interface GhostState {
  tile: { x: number; y: number } | null;
  canPlace: boolean;
  canAfford: boolean;
}

export class BuildingController {
  private readonly manager = new BuildingManager();
  private readonly panel: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly structuresList: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly placedList: HTMLDivElement;

  private selectedStructure: string | null = null;
  private open = false;
  private ghost: GhostState = { tile: null, canPlace: false, canAfford: false };
  private lastMessage: { text: string; error: boolean } | null = null;

  constructor(
    private readonly player: Player,
    private readonly input: InputManager,
    private readonly canvas: HTMLCanvasElement,
    private readonly viewport: { width: number; height: number },
    overlay: UnifiedOverlay
  ) {
    this.panel = document.createElement("div");
    this.panel.className = "build-panel hidden";

    this.header = document.createElement("div");
    this.header.className = "build-panel__header";

    this.structuresList = document.createElement("div");
    this.structuresList.className = "build-panel__structures";

    this.status = document.createElement("div");
    this.status.className = "build-panel__status";

    this.placedList = document.createElement("div");
    this.placedList.className = "build-panel__placed";

    this.panel.append(this.header, this.structuresList, this.status, this.placedList);

    overlay.registerTab({
      id: "building",
      label: "Build",
      icon: "🏗️",
      hotkeys: ["toggle-building"],
      element: this.panel,
      onOpen: () => this.openPanel(),
      onClose: () => this.closePanel()
    });
    this.canvas.addEventListener("click", event => this.handleCanvasClick(event));

    this.render();
  }

  private openPanel(): void {
    if (this.open) {
      return;
    }
    this.open = true;
    this.panel.classList.remove("hidden");
    this.render();
  }

  private closePanel(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.panel.classList.add("hidden");
    this.lastMessage = null;
    this.status.className = "build-panel__status";
    this.status.textContent = "";
  }

  update(): void {
    if (!this.open || !this.selectedStructure) {
      this.ghost = { tile: null, canPlace: false, canAfford: false };
      this.updateStatusLine();
      return;
    }
    const mouse = this.input.getMousePosition();
    const worldX = this.player.position.x - this.viewport.width / 2 + mouse.x;
    const worldY = this.player.position.y - this.viewport.height / 2 + mouse.y;
    const tile = {
      x: Math.floor(worldX / TILE_SIZE),
      y: Math.floor(worldY / TILE_SIZE)
    };
    const canAfford = this.manager.canAfford(this.selectedStructure, this.player.inventory);
    const canPlace = this.manager.canPlace(this.selectedStructure, tile);
    this.ghost = { tile, canPlace, canAfford };
    this.updateStatusLine();
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: { x: number; y: number }): void {
    const offsetX = playerPosition.x - this.viewport.width / 2;
    const offsetY = playerPosition.y - this.viewport.height / 2;

    this.manager.getPlaced().forEach(structure => {
      const screenX = structure.worldPosition.x - offsetX;
      const screenY = structure.worldPosition.y - offsetY;
      const width = structure.size[0] * TILE_SIZE;
      const height = structure.size[1] * TILE_SIZE;
      const powered = structure.definition.power_required_kw
        ? structure.powered
          ? "rgba(34, 197, 94, 0.45)"
          : "rgba(248, 113, 113, 0.45)"
        : "rgba(59, 130, 246, 0.35)";

      ctx.save();
      ctx.fillStyle = powered;
      ctx.fillRect(screenX, screenY, width, height);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, width, height);
      ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
      ctx.font = "12px sans-serif";
      ctx.fillText(structure.definition.name, screenX + 8, screenY + 18);
      if (structure.definition.power_required_kw) {
        const label = structure.powered ? "Powered" : "No Power";
        ctx.fillText(label, screenX + 8, screenY + 34);
      }
      ctx.restore();
    });

    if (this.open && this.selectedStructure && this.ghost.tile) {
      const definition = this.manager.getDefinition(this.selectedStructure);
      if (definition) {
        const worldX = this.ghost.tile.x * TILE_SIZE;
        const worldY = this.ghost.tile.y * TILE_SIZE;
        const screenX = worldX - offsetX;
        const screenY = worldY - offsetY;
        const width = definition.size[0] * TILE_SIZE;
        const height = definition.size[1] * TILE_SIZE;
        ctx.save();
        ctx.strokeStyle = this.ghost.canPlace && this.ghost.canAfford ? "#22c55e" : "#f87171";
        ctx.setLineDash([10, 6]);
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, width, height);
        ctx.restore();
      }
    }
  }

  private handleCanvasClick(event: MouseEvent): void {
    if (event.button !== 0 || !this.open || !this.selectedStructure) {
      return;
    }
    if (!this.ghost.tile) {
      return;
    }
    event.preventDefault();
    const result = this.manager.placeStructure(this.selectedStructure, this.ghost.tile, this.player.inventory);
    if (!result.success) {
      this.lastMessage = { text: result.error ?? "Unknown error", error: true };
    } else if (result.structure) {
      this.lastMessage = { text: `${result.structure.definition.name} placed`, error: false };
    }
    this.render();
  }

  private render(): void {
    const power = this.manager.getPowerSummary();
    this.header.innerHTML = `
      <strong>Base Building</strong>
      <span class="build-panel__power">Power ${power.availableKw.toFixed(2)} kW / ${power.consumptionKw.toFixed(2)} kW${
        power.deficitKw > 0 ? ` (Deficit ${power.deficitKw.toFixed(2)} kW)` : ""
      }</span>
      ${power.facilityKw > 0 ? `<span class="build-panel__power-detail">Facilities ${power.facilityKw.toFixed(2)} kW</span>` : ""}
      <span>Left click to place. Press B to close.</span>
    `;

    this.structuresList.innerHTML = "";
    const definitions = this.manager.getDefinitions();
    definitions.forEach(definition => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "build-panel__structure";
      const affordable = this.manager.canAfford(definition.id, this.player.inventory);
      if (!affordable) {
        button.dataset.affordable = "false";
      }
      if (definition.id === this.selectedStructure) {
        button.classList.add("is-selected");
      }
      button.innerHTML = `
        <strong>${definition.name}</strong>
        <span>${definition.size[0]}x${definition.size[1]} tiles · Tier ${definition.tier}</span>
        ${this.renderRequirements(definition)}
        ${this.renderPower(definition)}
      `;
      button.addEventListener("click", () => {
        this.selectedStructure = definition.id;
        this.lastMessage = null;
        this.render();
      });
      this.structuresList.append(button);
    });

    if (this.lastMessage) {
      this.status.className = this.lastMessage.error
        ? "build-panel__status build-panel__status--error"
        : "build-panel__status";
      this.status.textContent = this.lastMessage.text;
    } else {
      this.updateStatusLine();
    }

    this.renderPlaced();
  }

  private renderPlaced(): void {
    const placed = this.manager.getPlaced();
    this.placedList.innerHTML = "";
    const title = document.createElement("h4");
    title.textContent = "Placed";
    this.placedList.append(title);
    if (placed.length === 0) {
      const empty = document.createElement("span");
      empty.textContent = "No structures built yet.";
      this.placedList.append(empty);
      return;
    }
    placed.forEach(structure => {
      const row = document.createElement("span");
      const powerText = structure.definition.power_required_kw
        ? structure.powered
          ? "powered"
          : "no power"
        : "passive";
      row.textContent = `${structure.definition.name} – ${powerText}`;
      this.placedList.append(row);
    });
  }

  private renderRequirements(definition: { cost: Record<string, number> }): string {
    const entries = Object.entries(definition.cost);
    if (!entries.length) {
      return "<span>No cost</span>";
    }
    const items = entries
      .map(([itemId, qty]) => {
        const available = this.player.inventory.getQuantity(itemId);
        const color = available >= qty ? "#86efac" : "#fca5a5";
        return `<li style="color:${color}">${available}/${qty} · ${itemId}</li>`;
      })
      .join("");
    return `<ul class="build-panel__requirements">${items}</ul>`;
  }

  private renderPower(definition: {
    power_required_kw?: number;
    power_output_kw?: number;
  }): string {
    if (definition.power_output_kw) {
      return `<span>Generates ${definition.power_output_kw} kW</span>`;
    }
    if (definition.power_required_kw) {
      return `<span>Consumes ${definition.power_required_kw} kW</span>`;
    }
    return "";
  }

  private updateStatusLine(): void {
    if (!this.open || this.lastMessage) {
      return;
    }
    this.status.className = "build-panel__status";
    this.status.textContent = this.selectedStructure
      ? this.ghost.canAfford
        ? this.ghost.canPlace
          ? "Ready to place"
          : "Placement blocked"
        : "Missing materials"
      : "Select a structure to begin";
  }

  getPlacedStructures(): PlacedStructure[] {
    return this.manager.getPlaced();
  }

  getDefenseScore(): number {
    const placed = this.manager.getPlaced();
    if (!placed.length) {
      return 0;
    }
    const score = placed.reduce((total, structure) => {
      const hp = structure.definition.hp ?? structure.definition.tier * 100;
      const defensive = /wall|gate|tower|fence|turret/i.test(structure.definition.id);
      const weighting = defensive ? 1 : 0.35;
      return total + hp * weighting;
    }, 0);
    return Number(score.toFixed(1));
  }

  exportState(): SerializedStructurePlacement[] {
    return this.manager.serializePlacements();
  }

  importState(state: SerializedStructurePlacement[]): void {
    this.manager.loadPlacements(state);
    this.render();
  }

  getManager(): BuildingManager {
    return this.manager;
  }
}
