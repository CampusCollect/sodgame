import type { GameOptions } from "../engine/Game";
import type { Player } from "../entities/Player";
import type { InventoryController } from "../inventory/InventoryController";

export class Hud {
  private readonly container: HTMLDivElement;
  private readonly statusLine: HTMLDivElement;
  private readonly tooltip: HTMLDivElement;

  constructor(private readonly player: Player, private readonly inventory: InventoryController) {
    this.container = document.createElement("div");
    this.container.className = "hud";

    this.statusLine = document.createElement("div");
    this.statusLine.className = "hud-status";
    this.tooltip = document.createElement("div");
    this.tooltip.className = "hud-tooltip";
    this.tooltip.innerText =
      "WASD – Move | Shift – Sprint | Ctrl – Crouch | Tab – Inventory | C – Crafting | B – Building | J – Survivors | R – Raids | Z – Cycle Decoy | X – Use Decoy | E – Interact/Drive | V – Trailer Cargo";

    this.container.append(this.statusLine, this.tooltip);
    document.body.append(this.container);
  }

  update(_dt: number): void {
    this.statusLine.innerText = `Position: (${this.player.position.x.toFixed(0)}, ${this.player.position.y.toFixed(0)})`;
  }

  drawOverlay(_ctx: CanvasRenderingContext2D, _options: GameOptions): void {
    // Canvas overlay reserved for later (health bars, noise meter, etc.)
  }
}
