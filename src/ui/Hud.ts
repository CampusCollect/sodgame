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
  private readonly weaponActive: HTMLDivElement;
  private readonly weaponSlots: HTMLDivElement;

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
    this.weaponActive = document.createElement("div");
    this.weaponActive.className = "hud-weapon__active";
    this.weaponSlots = document.createElement("div");
    this.weaponSlots.className = "hud-weapon__slots";
    this.weaponLine.append(this.weaponActive, this.weaponSlots);
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
      this.vitalsLine.innerText = `HP ${vitals.health.toFixed(0)}/${vitals.maxHealth.toFixed(0)} (${healthPct.toFixed(0)}%) • Stamina ${staminaPct.toFixed(0)}% • Armor ${(vitals.armor * 100).toFixed(0)}% • Status ${vitals.statuses.join(", ")}`;
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

    this.renderWeaponStatus(weapon);
  }

  drawOverlay(_ctx: CanvasRenderingContext2D, _options: GameOptions): void {
    // Canvas overlay reserved for later (health bars, noise meter, etc.)
  }

  private buildKeyLegend(): void {
    const groups: { label: string; text: string }[] = [
      { label: "Movement", text: "WASD Move · Shift Sprint · Ctrl Crouch" },
      { label: "Systems", text: "Tab Inventory · C Crafting · B Build · N Facilities · J Survivors · R Raids · P Map · M Maintenance" },
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

  private renderWeaponStatus(weapon: WeaponHudStatus | null | undefined): void {
    if (!weapon) {
      this.weaponActive.innerText = "No weapon equipped – scavenge or craft gear";
      this.weaponSlots.replaceChildren(this.buildEmptySlotMessage());
      return;
    }
    const ammoString =
      weapon.magazineSize !== undefined && weapon.ammoInMag !== undefined
        ? `${weapon.ammoInMag}/${weapon.magazineSize}`
        : weapon.isMelee
          ? "Melee Ready"
          : "--";
    const reserve = weapon.ammoReserve !== undefined ? `Reserve ${weapon.ammoReserve}` : weapon.isMelee ? "" : "Reserve 0";
    const reload = weapon.isReloading && weapon.reloadProgress !== undefined
      ? `Reload ${(weapon.reloadProgress * 100).toFixed(0)}%`
      : null;
    const grenade = weapon.grenadeStatus ? `Grenade ${weapon.grenadeStatus}` : null;
    const segments = [
      `${weapon.name} (${weapon.isMelee ? "Melee" : weapon.fireMode ?? "Semi"}) ${ammoString}`,
      reserve
    ];
    if (reload) segments.push(reload);
    if (grenade) segments.push(grenade);
    if (weapon.message) segments.push(weapon.message);
    this.weaponActive.innerText = segments.filter(Boolean).join(" • ");

    if (!weapon.slots?.length) {
      this.weaponSlots.replaceChildren(this.buildEmptySlotMessage("No other weapons in pack"));
      return;
    }

    this.weaponSlots.replaceChildren(
      ...weapon.slots.map(slot => {
        const slotEl = document.createElement("div");
        slotEl.className = "hud-weapon__slot";
        if (slot.active) {
          slotEl.dataset.active = "true";
        }
        slotEl.innerHTML = `
          <span class="hud-weapon__slot-icon">${slot.icon ?? "\u2726"}</span>
          <div>
            <strong>${slot.name}</strong>
            <span>${slot.ammoLabel}</span>
          </div>
        `;
        return slotEl;
      })
    );
  }

  private buildEmptySlotMessage(text = "No weapons equipped"): HTMLDivElement {
    const empty = document.createElement("div");
    empty.className = "hud-weapon__slot hud-weapon__slot--empty";
    empty.innerText = text;
    return empty;
  }
}
