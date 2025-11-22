import type { Player } from "../entities/Player";
import type { Inventory } from "../inventory/Inventory";
import type { InputManager } from "../engine/Input";
import type { EquipmentManager } from "../inventory/EquipmentManager";

export interface PlayerVitalsSnapshot {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  bleed: number;
  infection: number;
  trauma: number;
  downed: boolean;
}

export interface PlayerVitalsHudState extends PlayerVitalsSnapshot {
  statusMessage: string | null;
  statuses: string[];
  armor: number;
}

interface DamageOptions {
  cause?: string;
  bleed?: number;
  infection?: number;
}

interface HealOptions {
  stopBleed?: boolean;
  reduceTrauma?: number;
  staminaBoost?: number;
}

const HEAL_PRIORITY: { itemId: string; label: string; heal: number; options: HealOptions }[] = [
  {
    itemId: "item_medkit",
    label: "Medkit",
    heal: 65,
    options: { stopBleed: true, reduceTrauma: 25, staminaBoost: 45 }
  },
  {
    itemId: "item_bandage",
    label: "Bandage",
    heal: 30,
    options: { stopBleed: true, reduceTrauma: 5 }
  }
];

export class PlayerVitals {
  private health = 100;
  private readonly maxHealth = 100;
  private stamina = 100;
  private readonly maxStamina = 100;
  private bleed = 0;
  private infection = 0;
  private trauma = 0;
  private downed = false;
  private statusMessage: string | null = null;
  private statusTimer = 0;

  constructor(
    private readonly player: Player,
    private readonly inventory: Inventory,
    input: InputManager,
    private readonly equipment?: EquipmentManager
  ) {
    input.on("quick-heal", () => this.requestHeal());
  }

  update(delta: number): void {
    if (this.statusTimer > 0) {
      this.statusTimer -= delta;
      if (this.statusTimer <= 0) {
        this.statusMessage = null;
      }
    }

    const movementIntensity = this.player.getMovementIntensity();
    const stance = this.player.getStance();
    const drainMultiplier = stance === "sprint" ? 18 : stance === "walk" ? 6 : 2;
    this.stamina -= movementIntensity * drainMultiplier * delta;
    if (movementIntensity === 0 && stance !== "sprint") {
      this.stamina += 14 * delta;
    }
    this.stamina = clamp(this.stamina, 0, this.maxStamina);

    if (this.bleed > 0) {
      const bleedDamage = (this.bleed / 100) * 8 * delta;
      this.applyRawDamage(bleedDamage, "Blood loss", true);
      this.bleed = clamp(this.bleed - 12 * delta, 0, 100);
    }

    if (this.infection > 40) {
      const infectionDamage = ((this.infection - 40) / 100) * 4 * delta;
      this.applyRawDamage(infectionDamage, "Infection", true);
    }

    if (this.trauma > 0) {
      this.trauma = clamp(this.trauma - 4 * delta, 0, 100);
    }

    if (this.health <= 0 && !this.downed) {
      this.downed = true;
      this.player.lockMovement("player-vitals");
      this.pushStatus("You succumbed to injuries – reload or heal before death", 6);
    } else if (this.downed && this.health > 0) {
      this.downed = false;
      this.player.unlockMovement("player-vitals");
    }
  }

  takeDamage(amount: number, options: DamageOptions = {}): void {
    if (amount <= 0) {
      return;
    }
    const mitigation = this.equipment ? Math.min(0.8, this.equipment.getArmorRating()) : 0;
    const mitigatedAmount = amount * (1 - mitigation);
    this.applyRawDamage(mitigatedAmount, options.cause ?? "Hit");
    if (options.bleed) {
      this.bleed = clamp(this.bleed + options.bleed, 0, 100);
    }
    if (options.infection) {
      this.infection = clamp(this.infection + options.infection, 0, 100);
    }
    this.trauma = clamp(this.trauma + amount * 0.35, 0, 100);
  }

  requestHeal(): void {
    if (this.downed) {
      this.pushStatus("Cannot heal while incapacitated", 2);
      return;
    }
    for (const option of HEAL_PRIORITY) {
      if (this.inventory.consumeItems([{ itemId: option.itemId, quantity: 1 }])) {
        this.applyHeal(option.heal, option.options, `${option.label} applied`);
        return;
      }
    }
    this.pushStatus("No bandages or medkits", 2);
  }

  getHudState(): PlayerVitalsHudState {
    const statuses: string[] = [];
    if (this.bleed > 0) statuses.push("Bleeding");
    if (this.infection > 0) statuses.push("Infected");
    if (this.trauma > 40) statuses.push("Injured");
    if (this.downed) statuses.push("Downed");
    if (!statuses.length) {
      statuses.push("Stable");
    }
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      bleed: this.bleed,
      infection: this.infection,
      trauma: this.trauma,
      downed: this.downed,
      statusMessage: this.statusMessage,
      statuses,
      armor: this.equipment?.getArmorRating() ?? 0
    };
  }

  serialize(): PlayerVitalsSnapshot {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      bleed: this.bleed,
      infection: this.infection,
      trauma: this.trauma,
      downed: this.downed
    };
  }

  load(snapshot: PlayerVitalsSnapshot | undefined): void {
    if (!snapshot) {
      return;
    }
    this.health = clamp(snapshot.health, 0, snapshot.maxHealth ?? this.maxHealth);
    this.stamina = clamp(snapshot.stamina, 0, snapshot.maxStamina ?? this.maxStamina);
    this.bleed = clamp(snapshot.bleed, 0, 100);
    this.infection = clamp(snapshot.infection, 0, 100);
    this.trauma = clamp(snapshot.trauma, 0, 100);
    this.downed = snapshot.downed;
    if (this.downed) {
      this.player.lockMovement("player-vitals");
    } else {
      this.player.unlockMovement("player-vitals");
    }
  }

  private applyHeal(amount: number, options: HealOptions, message: string): void {
    this.health = clamp(this.health + amount, 0, this.maxHealth);
    if (options.stopBleed) {
      this.bleed = 0;
    }
    if (options.reduceTrauma) {
      this.trauma = clamp(this.trauma - options.reduceTrauma, 0, 100);
    }
    if (options.staminaBoost) {
      this.stamina = clamp(this.stamina + options.staminaBoost, 0, this.maxStamina);
    }
    this.pushStatus(message, 3);
  }

  private applyRawDamage(amount: number, cause: string, silent = false): void {
    this.health = clamp(this.health - amount, 0, this.maxHealth);
    if (this.health <= 0) {
      this.health = 0;
    }
    if (!silent) {
      this.pushStatus(`${cause}: -${amount.toFixed(0)} HP`, 2.5);
    }
  }

  private pushStatus(message: string, duration: number): void {
    this.statusMessage = message;
    this.statusTimer = duration;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
