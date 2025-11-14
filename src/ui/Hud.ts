import type { GameOptions } from "../engine/Game";
import type { Player } from "../entities/Player";
import type { InventoryController } from "../inventory/InventoryController";
import type { ProgressionSummary } from "../progression/ProgressionController";
import type { WeaponHudStatus } from "../combat/CombatController";
import type { PlayerVitalsHudState } from "../combat/PlayerVitals";

export interface HudProgressionSummary extends ProgressionSummary {}

export class Hud {
  private readonly container: HTMLDivElement;
  private readonly statusLine: HTMLDivElement;
  private readonly vitalsLine: HTMLDivElement;
  private readonly tooltip: HTMLDivElement;
  private readonly metaLine: HTMLDivElement;
  private readonly weaponLine: HTMLDivElement;

  constructor(private readonly player: Player, private readonly inventory: InventoryController) {
    this.container = document.createElement("div");
    this.container.className = "hud";

    this.statusLine = document.createElement("div");
    this.statusLine.className = "hud-status";
    this.vitalsLine = document.createElement("div");
    this.vitalsLine.className = "hud-vitals";
    this.metaLine = document.createElement("div");
    this.metaLine.className = "hud-meta";
    this.weaponLine = document.createElement("div");
    this.weaponLine.className = "hud-weapon";
    this.tooltip = document.createElement("div");
    this.tooltip.className = "hud-tooltip";
    this.tooltip.innerText =
      "WASD – Move | Shift – Sprint | Ctrl – Crouch | Tab – Inventory | C – Crafting | B – Building | J – Survivors | R – Raids | Z – Cycle Decoy | X – Use Decoy | E – Interact/Drive | V – Trailer Cargo | Mouse1 – Fire | Q – Melee | F – Reload | 1 – Cycle Weapon | g – Throw Grenade | G – Cycle Grenade | T – Weapon Mods | H – Quick Heal";

    this.container.append(this.statusLine, this.vitalsLine, this.metaLine, this.weaponLine, this.tooltip);
    document.body.append(this.container);
  }

  update(
    _dt: number,
    progression?: HudProgressionSummary,
    weapon?: WeaponHudStatus | null,
    vitals?: PlayerVitalsHudState | null
  ): void {
    this.statusLine.innerText = `Position: (${this.player.position.x.toFixed(0)}, ${this.player.position.y.toFixed(0)})`;
    if (vitals) {
      const healthPct = (vitals.health / vitals.maxHealth) * 100;
      const staminaPct = (vitals.stamina / vitals.maxStamina) * 100;
      this.vitalsLine.innerText = `HP ${vitals.health.toFixed(0)}/${vitals.maxHealth.toFixed(0)} (${healthPct.toFixed(0)}%) • Stamina ${staminaPct.toFixed(0)}% • Status ${vitals.statuses.join(", ")}`;
      if (vitals.statusMessage) {
        this.vitalsLine.dataset.message = vitals.statusMessage;
      } else {
        delete this.vitalsLine.dataset.message;
      }
      if (vitals.downed) {
        this.vitalsLine.dataset.state = "downed";
      } else if (healthPct < 35) {
        this.vitalsLine.dataset.state = "critical";
      } else {
        delete this.vitalsLine.dataset.state;
      }
    } else {
      this.vitalsLine.innerText = "Vitals offline";
      delete this.vitalsLine.dataset.message;
      delete this.vitalsLine.dataset.state;
    }
    if (progression) {
      const seasonEffects = progression.seasonEffects.length ? progression.seasonEffects.join("/") : "None";
      const siegeHint = progression.nextSiegeThreshold ? `${progression.nextSiegeThreshold}%` : "Max";
      this.metaLine.innerText = `Ring ${progression.ring} • Heat ${progression.baseHeat}% (stage ${progression.siegeStage}) • Next Siege ${siegeHint} • Season ${progression.season} (${seasonEffects})`;
    } else {
      this.metaLine.innerText = "";
    }

    if (weapon) {
      const ammoString =
        weapon.magazineSize !== undefined && weapon.ammoInMag !== undefined
          ? `${weapon.ammoInMag}/${weapon.magazineSize}`
          : weapon.isMelee
            ? "Melee Ready"
            : "--";
      const reserve =
        weapon.ammoReserve !== undefined ? ` | Reserve ${weapon.ammoReserve}` : weapon.isMelee ? "" : " | Reserve 0";
      const reload = weapon.isReloading && weapon.reloadProgress !== undefined
        ? ` • Reload ${(weapon.reloadProgress * 100).toFixed(0)}%`
        : "";
      const message = weapon.message ? ` • ${weapon.message}` : "";
      this.weaponLine.innerText = `${weapon.name} (${weapon.isMelee ? "Melee" : weapon.fireMode ?? "Semi"}) ${ammoString}${reserve}${reload}${message}`;
    } else {
      this.weaponLine.innerText = "No weapon equipped – scavenge or craft gear";
    }
  }

  drawOverlay(_ctx: CanvasRenderingContext2D, _options: GameOptions): void {
    // Canvas overlay reserved for later (health bars, noise meter, etc.)
  }
}
