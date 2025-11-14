import type { GameOptions } from "../engine/Game";
import type { Player } from "../entities/Player";
import type { InventoryController } from "../inventory/InventoryController";
import type { ProgressionSummary } from "../progression/ProgressionController";

export interface HudProgressionSummary extends ProgressionSummary {}

export class Hud {
  private readonly container: HTMLDivElement;
  private readonly statusLine: HTMLDivElement;
  private readonly tooltip: HTMLDivElement;
  private readonly metaLine: HTMLDivElement;

  constructor(private readonly player: Player, private readonly inventory: InventoryController) {
    this.container = document.createElement("div");
    this.container.className = "hud";

    this.statusLine = document.createElement("div");
    this.statusLine.className = "hud-status";
    this.metaLine = document.createElement("div");
    this.metaLine.className = "hud-meta";
    this.tooltip = document.createElement("div");
    this.tooltip.className = "hud-tooltip";
    this.tooltip.innerText =
      "WASD – Move | Shift – Sprint | Ctrl – Crouch | Tab – Inventory | C – Crafting | B – Building | J – Survivors | R – Raids | Z – Cycle Decoy | X – Use Decoy | E – Interact/Drive | V – Trailer Cargo";

    this.container.append(this.statusLine, this.metaLine, this.tooltip);
    document.body.append(this.container);
  }

  update(_dt: number, progression?: HudProgressionSummary): void {
    this.statusLine.innerText = `Position: (${this.player.position.x.toFixed(0)}, ${this.player.position.y.toFixed(0)})`;
    if (progression) {
      const seasonEffects = progression.seasonEffects.length ? progression.seasonEffects.join("/") : "None";
      const siegeHint = progression.nextSiegeThreshold ? `${progression.nextSiegeThreshold}%` : "Max";
      this.metaLine.innerText = `Ring ${progression.ring} • Heat ${progression.baseHeat}% (stage ${progression.siegeStage}) • Next Siege ${siegeHint} • Season ${progression.season} (${seasonEffects})`;
    } else {
      this.metaLine.innerText = "";
    }
  }

  drawOverlay(_ctx: CanvasRenderingContext2D, _options: GameOptions): void {
    // Canvas overlay reserved for later (health bars, noise meter, etc.)
  }
}
