import type { GameOptions } from "../engine/Game";
import type { Player } from "../entities/Player";
import type { InventoryController } from "../inventory/InventoryController";
import type { ProgressionSummary } from "../progression/ProgressionController";
import type { WeaponHudStatus } from "../combat/CombatController";
import type { PlayerVitalsHudState } from "../combat/PlayerVitals";
import type { StockpileSnapshot } from "../building/BaseStockpile";

export interface HudProgressionSummary extends ProgressionSummary {}

export class Hud {
  private readonly container: HTMLDivElement;
  private readonly statusLine: HTMLDivElement;
  private readonly vitalsLine: HTMLDivElement;
  private readonly tooltip: HTMLDivElement;
  private readonly resourceLine: HTMLDivElement;
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
    this.resourceLine = document.createElement("div");
    this.resourceLine.className = "hud-resources";
    this.weaponLine = document.createElement("div");
    this.weaponLine.className = "hud-weapon";
    this.tooltip = document.createElement("div");
    this.tooltip.className = "hud-tooltip";
    this.buildKeyLegend();

    this.container.append(
      this.statusLine,
      this.vitalsLine,
      this.metaLine,
      this.resourceLine,
      this.weaponLine,
      this.tooltip
    );
    document.body.append(this.container);
  }

  update(
    _dt: number,
    progression?: HudProgressionSummary,
    weapon?: WeaponHudStatus | null,
    vitals?: PlayerVitalsHudState | null,
    stockpile?: StockpileSnapshot | null
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

    if (stockpile) {
      const keys: (keyof StockpileSnapshot)[] = ["food", "meds", "fuel", "ammo", "parts"];
      const text = keys
        .map(key => `${key.slice(0, 1).toUpperCase()}${key.slice(1, 2)}:${stockpile[key].toFixed(0)}`)
        .join(" • ");
      this.resourceLine.innerText = `Stockpile ${text}`;
    } else {
      this.resourceLine.innerText = "Stockpile offline";
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

  private buildKeyLegend(): void {
    const groups: { label: string; text: string }[] = [
      { label: "Movement", text: "WASD Move · Shift Sprint · Ctrl Crouch" },
      { label: "Systems", text: "Tab Inventory · C Crafting · B Build · N Facilities · J Survivors · R Raids" },
      { label: "Gear", text: "Z Cycle Decoy · X Use Decoy · V Trailer Cargo · T Weapon Mods" },
      { label: "Combat", text: "Mouse1 Fire · Q Melee · F Reload · 1 Cycle Weapon · g Throw Grenade · G Cycle Grenade" },
      { label: "Support", text: "E Interact/Drive · H Quick Heal · F5 Save · F9 Load" }
    ];
    this.tooltip.replaceChildren();
    groups.forEach(group => {
      const row = document.createElement("div");
      row.className = "hud-tooltip__row";
      const strong = document.createElement("strong");
      strong.textContent = group.label;
      const span = document.createElement("span");
      span.textContent = group.text;
      row.append(strong, span);
      this.tooltip.append(row);
    });
  }
}
