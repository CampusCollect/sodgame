import type { Player, Vector2 } from "../entities/Player";
import type { InputManager } from "../engine/Input";
import type { ZombieDirector } from "../ai/ZombieDirector";
import type { StealthController } from "../stealth/StealthController";
import type { GameOptions } from "../engine/Game";
import type { PlacedItem } from "../inventory/GridInventory";
import { createStack, resolveItemDefinition } from "../inventory/Item";
import type { WeaponDefinition } from "../data/ContentRegistry";

interface Projectile {
  id: string;
  position: Vector2;
  velocity: Vector2;
  speed: number;
  range: number;
  travelled: number;
  radius: number;
  damage: number;
}

interface ActiveGrenade {
  id: string;
  itemId: string;
  label: string;
  position: Vector2;
  velocity: Vector2;
  fuse: number;
  radius: number;
  damage: number;
  noiseClass: string;
  status?: string;
  exploded: boolean;
  flashTimer: number;
}

const FIST_STATS: WeaponDefinition = {
  category: "melee",
  damage: 10,
  range: 50,
  attack_cooldown_s: 0.8,
  swing_arc_deg: 70,
  swing_time_s: 0.25,
  noise_class: "noise_melee_hit"
};

export interface WeaponHudStatus {
  name: string;
  ammoInMag?: number;
  magazineSize?: number;
  ammoReserve?: number;
  fireMode?: string;
  isReloading: boolean;
  reloadProgress?: number;
  isMelee: boolean;
  message?: string;
  grenadeStatus?: string;
}

interface ReloadState {
  weaponId: string;
  timer: number;
  total: number;
}

export class CombatController {
  private readonly projectiles: Projectile[] = [];
  private activeWeaponIndex = 0;
  private fireCooldown = 0;
  private meleeSwingTimer = 0;
  private meleeVisualTimer = 0;
  private meleeVisualRange = FIST_STATS.range;
  private meleeVisualArc = FIST_STATS.swing_arc_deg ?? 70;
  private queuedMelee = false;
  private readonly magazineState = new Map<string, number>();
  private reloadState: ReloadState | null = null;
  private muzzleFlashTimer = 0;
  private hudStatus: WeaponHudStatus | null = null;
  private statusMessage: string | null = null;
  private statusMessageTimer = 0;
  private readonly activeGrenades: ActiveGrenade[] = [];
  private grenadeQueued = false;
  private selectedGrenadeId: string | null = null;

  constructor(
    private readonly player: Player,
    private readonly input: InputManager,
    private readonly zombies: ZombieDirector,
    private readonly stealth: StealthController
  ) {
    this.input.on("reload-weapon", () => this.requestReload());
    this.input.on("melee-attack", () => (this.queuedMelee = true));
    this.input.on("cycle-weapon", () => this.cycleWeapon());
    this.input.on("use-grenade", () => (this.grenadeQueued = true));
    this.input.on("cycle-grenade", () => this.cycleGrenade());
  }

  update(delta: number, viewport: Pick<GameOptions, "width" | "height">): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    this.meleeSwingTimer = Math.max(0, this.meleeSwingTimer - delta);
    this.meleeVisualTimer = Math.max(0, this.meleeVisualTimer - delta);
    this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - delta);
    this.statusMessageTimer = Math.max(0, this.statusMessageTimer - delta);
    if (this.statusMessageTimer <= 0) {
      this.statusMessage = null;
    }

    if (this.grenadeQueued) {
      this.tryThrowGrenade(viewport);
      this.grenadeQueued = false;
    }

    const weapons = this.collectWeapons();
    if (this.activeWeaponIndex >= weapons.length) {
      this.activeWeaponIndex = Math.max(0, weapons.length - 1);
    }
    const equipped = weapons[this.activeWeaponIndex] ?? null;

    if (this.reloadState) {
      this.reloadState.timer -= delta;
      if (this.reloadState.timer <= 0) {
        this.completeReload();
      }
    }

    if (this.player.inventory.isOpen) {
      this.queuedMelee = false;
    } else {
      if (this.input.isMouseDown(0)) {
        this.tryFire(equipped, viewport);
      }
      if (this.queuedMelee && this.meleeSwingTimer <= 0) {
        this.executeMelee(equipped);
        this.queuedMelee = false;
      }
    }

    this.updateProjectiles(delta);
    this.updateGrenades(delta);
    this.updateHudStatus(equipped);
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2, viewport: Pick<GameOptions, "width" | "height">): void {
    const offset = {
      x: playerPosition.x - viewport.width / 2,
      y: playerPosition.y - viewport.height / 2
    };

    ctx.save();
    ctx.fillStyle = "#fde047";
    this.projectiles.forEach(projectile => {
      ctx.beginPath();
      ctx.arc(projectile.position.x - offset.x, projectile.position.y - offset.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    this.activeGrenades.forEach(grenade => {
      if (!grenade.exploded) {
        ctx.fillStyle = "#fb923c";
        ctx.beginPath();
        ctx.arc(grenade.position.x - offset.x, grenade.position.y - offset.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const alpha = Math.max(0, grenade.flashTimer / 0.4);
        ctx.strokeStyle = `rgba(248, 250, 252, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(grenade.position.x - offset.x, grenade.position.y - offset.y, grenade.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    if (this.muzzleFlashTimer > 0) {
      ctx.strokeStyle = "rgba(252, 211, 77, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playerPosition.x - offset.x, playerPosition.y - offset.y);
      ctx.lineTo(
        playerPosition.x - offset.x + this.player.direction.x * 35,
        playerPosition.y - offset.y + this.player.direction.y * 35
      );
      ctx.stroke();
    }

    if (this.meleeVisualTimer > 0) {
      ctx.strokeStyle = "rgba(244, 114, 182, 0.6)";
      ctx.lineWidth = 2;
      const startAngle =
        Math.atan2(this.player.direction.y, this.player.direction.x) - (this.meleeVisualArc * Math.PI) / 360;
      const endAngle = startAngle + (this.meleeVisualArc * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(playerPosition.x - offset.x, playerPosition.y - offset.y, this.meleeVisualRange, startAngle, endAngle);
      ctx.stroke();
    }
    ctx.restore();
  }

  getWeaponStatus(): WeaponHudStatus | null {
    return this.hudStatus;
  }

  private collectWeapons(): PlacedItem[] {
    return this.player
      .inventory
      .getPlacedItems()
      .filter(item => item.definition.tags.includes("weapon"))
      .sort((a, b) => {
        const score = (placed: PlacedItem) => (placed.definition.weapon?.category === "firearm" ? 0 : 1);
        return score(a) - score(b);
      });
  }

  private getAvailableGrenades(): { itemId: string; name: string; count: number }[] {
    const counts = new Map<string, { name: string; count: number }>();
    this.player.inventory.getPlacedItems().forEach(item => {
      if (!item.definition.grenade) {
        return;
      }
      const existing = counts.get(item.stack.itemId) ?? { name: item.definition.name, count: 0 };
      existing.count += item.stack.quantity;
      counts.set(item.stack.itemId, existing);
    });
    return [...counts.entries()]
      .map(([itemId, data]) => ({ itemId, name: data.name, count: data.count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private ensureGrenadeSelection(): void {
    const grenades = this.getAvailableGrenades();
    if (!grenades.length) {
      this.selectedGrenadeId = null;
      return;
    }
    const exists = grenades.some(g => g.itemId === this.selectedGrenadeId);
    if (!exists) {
      this.selectedGrenadeId = grenades[0].itemId;
    }
  }

  private tryFire(weapon: PlacedItem | null, viewport: Pick<GameOptions, "width" | "height">): void {
    if (!weapon || !weapon.definition.weapon || weapon.definition.weapon.category !== "firearm") {
      return;
    }
    if (this.reloadState && this.reloadState.weaponId === weapon.id) {
      return;
    }
    if (this.fireCooldown > 0) {
      return;
    }
    const stats = this.getEffectiveWeaponStats(weapon);
    const ammoInMag = this.ensureMagazineState(weapon, stats);
    if (ammoInMag <= 0) {
      this.requestReload();
      this.setStatusMessage("Empty magazine");
      return;
    }

    const aimTarget = this.getAimPoint(viewport);
    const direction =
      normalize({
        x: aimTarget.x - this.player.position.x,
        y: aimTarget.y - this.player.position.y
      }) ?? { ...this.player.direction };
    const muzzle = {
      x: this.player.position.x + direction.x * 20,
      y: this.player.position.y + direction.y * 20
    };
    const projectileCount = stats.projectile_count ?? 1;
    for (let i = 0; i < projectileCount; i += 1) {
      const spread = ((stats.projectile_spread_deg ?? 0) * Math.PI) / 180;
      const angleOffset = spread === 0 ? 0 : (Math.random() - 0.5) * spread;
      const rotated = rotate(direction, angleOffset);
      const speed = stats.projectile_speed ?? 900;
      const velocity = { x: rotated.x * speed, y: rotated.y * speed };
      this.projectiles.push({
        id: `proj_${Math.random().toString(36).slice(2)}`,
        position: { ...muzzle },
        velocity,
        speed,
        range: stats.range,
        travelled: 0,
        radius: 12,
        damage: stats.damage
      });
    }
    this.magazineState.set(weapon.id, ammoInMag - 1);
    this.fireCooldown = stats.attack_cooldown_s;
    this.muzzleFlashTimer = 0.08;
    this.emitNoise(stats.noise_class ?? "noise_gunshot_unsuppressed");
    weapon.stack.condition = Math.max(0, weapon.stack.condition - 0.5);
  }

  private ensureMagazineState(weapon: PlacedItem, stats: WeaponDefinition): number {
    if (!this.magazineState.has(weapon.id)) {
      const capacity = stats.magazine_size ?? 0;
      this.magazineState.set(weapon.id, capacity);
    }
    return this.magazineState.get(weapon.id)!;
  }

  private requestReload(): void {
    const weapon = this.collectWeapons()[this.activeWeaponIndex];
    if (!weapon || !weapon.definition.weapon || weapon.definition.weapon.category !== "firearm") {
      this.setStatusMessage("No firearm equipped");
      return;
    }
    const stats = weapon.definition.weapon;
    const magazine = this.ensureMagazineState(weapon, stats);
    const capacity = stats.magazine_size ?? 0;
    if (!stats.ammo_type || capacity <= 0) {
      this.setStatusMessage("Fixed-mag weapon");
      return;
    }
    if (magazine >= capacity) {
      this.setStatusMessage("Magazine full");
      return;
    }
    const available = this.player.inventory.getQuantity(stats.ammo_type);
    if (available <= 0) {
      this.setStatusMessage("Out of ammo");
      return;
    }
    const reloadTime = stats.reload_seconds ?? 2;
    this.reloadState = { weaponId: weapon.id, timer: reloadTime, total: reloadTime };
  }

  private completeReload(): void {
    if (!this.reloadState) return;
    const weapon = this.collectWeapons().find(item => item.id === this.reloadState?.weaponId);
    if (!weapon || !weapon.definition.weapon) {
      this.reloadState = null;
      return;
    }
    const stats = weapon.definition.weapon;
    if (!stats.ammo_type || !stats.magazine_size) {
      this.reloadState = null;
      return;
    }
    const available = this.player.inventory.getQuantity(stats.ammo_type);
    if (available <= 0) {
      this.setStatusMessage("Ammo depleted");
      this.reloadState = null;
      return;
    }
    const current = this.ensureMagazineState(weapon, stats);
    const needed = stats.magazine_size - current;
    if (needed <= 0) {
      this.reloadState = null;
      return;
    }
    const toLoad = Math.min(needed, available);
    this.player.inventory.consumeItems([{ itemId: stats.ammo_type, quantity: toLoad }]);
    this.magazineState.set(weapon.id, current + toLoad);
    this.reloadState = null;
  }

  private executeMelee(weapon: PlacedItem | null): void {
    const stats =
      weapon?.definition.weapon && weapon.definition.weapon.category === "melee"
        ? this.getEffectiveWeaponStats(weapon)
        : FIST_STATS;
    this.meleeSwingTimer = stats.attack_cooldown_s;
    this.meleeVisualTimer = stats.swing_time_s ?? 0.35;
    this.meleeVisualRange = stats.range;
    this.meleeVisualArc = stats.swing_arc_deg ?? 70;

    const zombies = this.zombies.getZombies();
    let hits = 0;
    zombies.forEach(zombie => {
      const dx = zombie.position.x - this.player.position.x;
      const dy = zombie.position.y - this.player.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance > stats.range) {
        return;
      }
      const direction = normalize({ x: dx, y: dy });
      if (!direction) {
        return;
      }
      const angleDiff = angleBetween(direction, normalize(this.player.direction) ?? { x: 1, y: 0 });
      if (angleDiff > (this.meleeVisualArc * Math.PI) / 360) {
        return;
      }
      this.zombies.applyDamage(zombie.id, stats.damage);
      hits += 1;
    });
    this.emitNoise(stats.noise_class ?? "noise_melee_hit");
    if (hits === 0) {
      this.setStatusMessage("Melee missed");
    }
  }

  private cycleWeapon(): void {
    const total = this.collectWeapons().length;
    if (total === 0) {
      this.setStatusMessage("No weapons in pack");
      return;
    }
    this.activeWeaponIndex = (this.activeWeaponIndex + 1) % total;
    this.setStatusMessage("Swapped weapon");
  }

  private cycleGrenade(): void {
    const grenades = this.getAvailableGrenades();
    if (!grenades.length) {
      this.setStatusMessage("No grenades to select");
      this.selectedGrenadeId = null;
      return;
    }
    this.ensureGrenadeSelection();
    const index = grenades.findIndex(g => g.itemId === this.selectedGrenadeId);
    const next = grenades[(index + 1) % grenades.length];
    this.selectedGrenadeId = next.itemId;
    this.setStatusMessage(`Selected ${next.name}`);
  }

  private describeGrenadeStatus(): string | null {
    const grenades = this.getAvailableGrenades();
    if (!grenades.length) {
      this.selectedGrenadeId = null;
      return null;
    }
    this.ensureGrenadeSelection();
    const active = grenades.find(g => g.itemId === this.selectedGrenadeId) ?? grenades[0];
    return `${active.name} x${active.count}`;
  }

  private tryThrowGrenade(viewport: Pick<GameOptions, "width" | "height">): void {
    if (this.player.inventory.isOpen) {
      this.setStatusMessage("Close inventory to throw grenades");
      return;
    }
    const grenades = this.getAvailableGrenades();
    if (!grenades.length) {
      this.setStatusMessage("No grenades to throw");
      return;
    }
    this.ensureGrenadeSelection();
    const selectedId = this.selectedGrenadeId ?? grenades[0].itemId;
    const definition = resolveItemDefinition(selectedId);
    if (!definition.grenade) {
      return;
    }
    const removed = this.player.inventory.consumeItems([{ itemId: selectedId, quantity: 1 }]);
    if (!removed) {
      this.setStatusMessage("Grenade not found");
      this.selectedGrenadeId = null;
      return;
    }
    const aimTarget = this.getAimPoint(viewport);
    const direction =
      normalize({
        x: aimTarget.x - this.player.position.x,
        y: aimTarget.y - this.player.position.y
      }) ?? { ...this.player.direction };
    const velocity = {
      x: direction.x * definition.grenade.throw_speed,
      y: direction.y * definition.grenade.throw_speed
    };
    const grenade: ActiveGrenade = {
      id: `grenade-${Date.now()}-${Math.random()}`,
      itemId: selectedId,
      label: definition.name,
      position: { ...this.player.position },
      velocity,
      fuse: definition.grenade.fuse_seconds,
      radius: definition.grenade.radius,
      damage: definition.grenade.damage,
      noiseClass: definition.grenade.noise_class,
      status: definition.grenade.status_effect,
      exploded: false,
      flashTimer: 0
    };
    this.activeGrenades.push(grenade);
    this.setStatusMessage(`Threw ${definition.name}`);
  }

  private updateGrenades(delta: number): void {
    for (let i = this.activeGrenades.length - 1; i >= 0; i -= 1) {
      const grenade = this.activeGrenades[i];
      if (!grenade.exploded) {
        grenade.position.x += grenade.velocity.x * delta;
        grenade.position.y += grenade.velocity.y * delta;
        grenade.velocity.x *= 0.9;
        grenade.velocity.y *= 0.9;
        grenade.fuse -= delta;
        if (grenade.fuse <= 0) {
          this.detonateGrenade(grenade);
        }
      } else {
        grenade.flashTimer -= delta;
        if (grenade.flashTimer <= 0) {
          this.activeGrenades.splice(i, 1);
        }
      }
    }
  }

  private detonateGrenade(grenade: ActiveGrenade): void {
    grenade.exploded = true;
    grenade.flashTimer = 0.4;
    grenade.velocity = { x: 0, y: 0 };
    this.emitNoise(grenade.noiseClass);
    this.zombies.getZombies().forEach(zombie => {
      const distance = Math.hypot(zombie.position.x - grenade.position.x, zombie.position.y - grenade.position.y);
      if (distance <= grenade.radius) {
        this.zombies.applyDamage(zombie.id, grenade.damage);
      }
    });
    this.setStatusMessage(`${grenade.label} detonated`);
  }

  getEquippedWeapon(): PlacedItem | null {
    const weapons = this.collectWeapons();
    return weapons[this.activeWeaponIndex] ?? null;
  }

  disassembleEquippedWeapon(): boolean {
    const weapons = this.collectWeapons();
    const weapon = weapons[this.activeWeaponIndex];
    if (!weapon) {
      this.setStatusMessage("No weapon equipped");
      return false;
    }
    if (!weapon.definition.disassembly_yield?.length) {
      this.setStatusMessage("Cannot disassemble");
      return false;
    }
    if (this.reloadState && this.reloadState.weaponId === weapon.id) {
      this.setStatusMessage("Cancel reload first");
      return false;
    }
    const removed = this.player.inventory.removePlacedItem(weapon.id);
    if (!removed) {
      return false;
    }
    const salvageIssues: string[] = [];
    weapon.definition.disassembly_yield.forEach(entry => {
      const result = this.player.inventory.add(createStack(entry.item, entry.qty));
      if (result.accepted === 0) {
        salvageIssues.push(`${entry.item} (no space)`);
      } else if (!result.success) {
        salvageIssues.push(`${entry.item} (partial)`);
      }
    });
    this.magazineState.delete(weapon.id);
    this.activeWeaponIndex = 0;
    if (salvageIssues.length) {
      this.setStatusMessage(`Weapon disassembled – free space for ${salvageIssues.join(", ")}`);
    } else {
      this.setStatusMessage("Weapon disassembled");
    }
    return true;
  }

  notifyAttachmentsChanged(weaponId: string): void {
    const magazine = this.magazineState.get(weaponId);
    if (magazine !== undefined) {
      const weapon = this.collectWeapons().find(item => item.id === weaponId);
      const stats = weapon?.definition.weapon;
      if (weapon && stats) {
        const effective = this.getEffectiveWeaponStats(weapon);
        const maxMag = effective.magazine_size ?? stats.magazine_size ?? 0;
        this.magazineState.set(weaponId, Math.min(magazine, maxMag));
      }
    }
  }

  private emitNoise(classId: string): void {
    this.stealth.getNoise().emit(classId, { ...this.player.position });
  }

  private updateProjectiles(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.position.x += projectile.velocity.x * delta;
      projectile.position.y += projectile.velocity.y * delta;
      projectile.travelled += projectile.speed * delta;
      if (this.tryHitZombie(projectile)) {
        this.projectiles.splice(i, 1);
        continue;
      }
      if (projectile.travelled >= projectile.range) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private tryHitZombie(projectile: Projectile): boolean {
    for (const zombie of this.zombies.getZombies()) {
      const distance = Math.hypot(zombie.position.x - projectile.position.x, zombie.position.y - projectile.position.y);
      if (distance <= projectile.radius) {
        this.zombies.applyDamage(zombie.id, projectile.damage);
        return true;
      }
    }
    return false;
  }

  private getEffectiveWeaponStats(weapon: PlacedItem): WeaponDefinition {
    const base = weapon.definition.weapon;
    if (!base) {
      return FIST_STATS;
    }
    const stats: WeaponDefinition = { ...base };
    const attachments = weapon.stack.attachments ?? {};
    if (attachments.optic) {
      stats.projectile_spread_deg = Math.max(0.2, (stats.projectile_spread_deg ?? 5) * 0.7);
      stats.range = Math.round(stats.range * 1.1);
    }
    if (attachments.suppressor && stats.category === "firearm") {
      stats.noise_class = "noise_gunshot_suppressed";
      stats.damage = Math.round(stats.damage * 0.9);
    }
    if (attachments.magazine && stats.magazine_size) {
      stats.magazine_size = Math.max(stats.magazine_size + 1, Math.round(stats.magazine_size * 1.4));
    }
    return stats;
  }

  private updateHudStatus(weapon: PlacedItem | null): void {
    if (!weapon || !weapon.definition.weapon) {
      this.hudStatus = null;
      return;
    }
    const stats = this.getEffectiveWeaponStats(weapon);
    const isReloading = Boolean(this.reloadState && this.reloadState.weaponId === weapon.id);
    const reloadProgress = isReloading && this.reloadState?.total
      ? 1 - this.reloadState.timer / this.reloadState.total
      : undefined;
    const ammoInMag = stats.category === "firearm" ? this.ensureMagazineState(weapon, stats) : undefined;
    const ammoReserve = stats.category === "firearm" && stats.ammo_type ? this.player.inventory.getQuantity(stats.ammo_type) : undefined;

    this.hudStatus = {
      name: weapon.definition.name,
      ammoInMag,
      magazineSize: stats.magazine_size,
      ammoReserve,
      fireMode: stats.fire_mode,
      isReloading,
      reloadProgress,
      isMelee: stats.category === "melee",
      message: this.statusMessage ?? undefined,
      grenadeStatus: this.describeGrenadeStatus() ?? undefined
    };
  }

  private getAimPoint(viewport: Pick<GameOptions, "width" | "height">): Vector2 {
    const mouse = this.input.getMousePosition();
    return {
      x: this.player.position.x + (mouse.x - viewport.width / 2),
      y: this.player.position.y + (mouse.y - viewport.height / 2)
    };
  }

  private setStatusMessage(message: string): void {
    this.statusMessage = message;
    this.statusMessageTimer = 2.5;
  }
}

function normalize(vector: Vector2): Vector2 | null {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) return null;
  return { x: vector.x / length, y: vector.y / length };
}

function rotate(vector: Vector2, radians: number): Vector2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos
  };
}

function angleBetween(a: Vector2, b: Vector2): number {
  const dot = a.x * b.x + a.y * b.y;
  const det = a.x * b.y - a.y * b.x;
  return Math.abs(Math.atan2(det, dot));
}
