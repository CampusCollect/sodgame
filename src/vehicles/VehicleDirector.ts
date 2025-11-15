import type { Player, Vector2 } from "../entities/Player";
import type { World } from "../worldgen/World";
import type { VehicleDefinition, TrailerDefinition } from "../data/ContentRegistry";
import { content } from "../data";
import { TrailerHitch } from "./TrailerHitch";
import { CargoManifest, type CargoEntry } from "./CargoManifest";
import type { InputManager } from "../engine/Input";
import { TransparentCargoHUD } from "../ui/TransparentCargoHUD";
import { MaintenanceUI } from "./MaintenanceUI";
import type { NoiseBus } from "../stealth/NoiseBus";

export interface VehicleSaveState {
  id: string;
  definitionId: string;
  position: Vector2;
  facing: number;
  fuel: number;
  condition: number;
}

interface VehicleInstance {
  id: string;
  definition: VehicleDefinition;
  position: Vector2;
  facing: number;
  speed: number;
  driver: "player" | null;
  hitch?: TrailerHitch;
  manifest?: CargoManifest;
  fuelLiters: number;
  fuelCapacity: number;
  condition: number; // 0..1
  noiseCooldown: number;
}

const INTERACTION_RANGE = 110;
const TRAILER_RANGE = 160;
const TURN_RATE = Math.PI;
const TRAILER_OFFSET = 140;
const REFUEL_ITEM_ID = "item_fuel_can";
const FUEL_PER_CAN = 20;
const BASE_FUEL_BURN = 0.18; // liters per second at max speed
const CONDITION_WEAR_RATE = 0.02; // per minute of driving
const MIN_CONDITION_SPEED_SCALE = 0.45;
const NOISE_INTERVAL = 0.75;
const MANIFEST_WEIGHT_IMPACT = 0.00015;

export class VehicleDirector {
  private readonly vehicles: VehicleInstance[] = [];
  private readonly cargoHud = new TransparentCargoHUD("Trailer Cargo");
  private readonly hint: HTMLDivElement;
  private readonly maintenance = new MaintenanceUI();
  private activeVehicle: VehicleInstance | null = null;
  private nearestVehicle: VehicleInstance | null = null;
  private cargoVisible = false;
  private maintenanceVisible = false;

  constructor(private readonly player: Player, private readonly input: InputManager, private readonly noise?: NoiseBus) {
    const spawnPoints: Vector2[] = [
      { x: 180, y: -120 },
      { x: -220, y: 200 },
      { x: 60, y: 260 }
    ];
    content.vehicles.forEach((definition, index) => {
      const position = spawnPoints[index % spawnPoints.length];
      const instance: VehicleInstance = {
        id: `${definition.id}_${index}`,
        definition,
        position: { ...position },
        facing: 0,
        speed: 0,
        driver: null,
        fuelLiters: definition.fuel_l,
        fuelCapacity: definition.fuel_l,
        condition: 1,
        noiseCooldown: 0
      };
      if (definition.requires_trailer) {
        const trailerDef = content.trailers.find(t => definition.compatible_trailers.includes(t.id));
        if (trailerDef) {
          instance.hitch = new TrailerHitch(definition);
          instance.hitch.attach(trailerDef);
          instance.manifest = new CargoManifest(trailerDef);
          this.seedDemoCargo(instance.manifest);
        }
      }
      this.vehicles.push(instance);
    });

    this.input.on("interact", () => this.handleInteract());
    this.input.on("toggle-vehicle-cargo", () => this.toggleCargoOverlay());
    this.input.on("toggle-maintenance", () => this.toggleMaintenance());
    this.input.on("refuel-vehicle", () => this.tryRefuel());

    this.hint = document.createElement("div");
    this.hint.className = "vehicle-hint";
    document.body.append(this.hint);
    this.setHint("");
  }

  update(deltaTime: number, _world: World, _player: Player): void {
    this.nearestVehicle = this.findNearestVehicle();
    this.updateActiveVehicle(deltaTime);
    this.refreshCargoHud();
    this.refreshHint();
    this.updateMaintenancePanel();
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2): void {
    const offset: Vector2 = {
      x: playerPosition.x - window.innerWidth / 2,
      y: playerPosition.y - window.innerHeight / 2
    };

    this.vehicles.forEach(vehicle => {
      ctx.save();
      ctx.translate(vehicle.position.x - offset.x, vehicle.position.y - offset.y);
      ctx.rotate(vehicle.facing);
      ctx.fillStyle = vehicle.definition.requires_trailer ? "#dc2626" : "#94a3b8";
      ctx.fillRect(-28, -56, 56, 112);
      if (vehicle === this.activeVehicle) {
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 3;
        ctx.strokeRect(-32, -60, 64, 120);
      }
      ctx.restore();

      const trailerPosition = this.getTrailerPosition(vehicle);
      if (trailerPosition && vehicle.hitch?.current.trailer) {
        const trailer = vehicle.hitch.current.trailer;
        ctx.save();
        ctx.translate(trailerPosition.x - offset.x, trailerPosition.y - offset.y);
        ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
        ctx.fillRect(-trailer.grid[0] * 2, -trailer.grid[1] * 2, trailer.grid[0] * 4, trailer.grid[1] * 4);
        if (this.cargoVisible && this.getCargoTarget()?.manifest === vehicle.manifest) {
          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 3;
          ctx.strokeRect(-trailer.grid[0] * 2 - 4, -trailer.grid[1] * 2 - 4, trailer.grid[0] * 4 + 8, trailer.grid[1] * 4 + 8);
        }
        ctx.restore();
      }
    });
  }

  private updateActiveVehicle(deltaTime: number): void {
    if (!this.activeVehicle) {
      return;
    }
    const { definition } = this.activeVehicle;
    const speedScale = MIN_CONDITION_SPEED_SCALE + (1 - MIN_CONDITION_SPEED_SCALE) * this.activeVehicle.condition;
    const maxForwardSpeed = definition.speed_ms * speedScale;
    const accel = definition.speed_ms * 1.5;
    const hasFuel = this.activeVehicle.fuelLiters > 0.2;

    if (hasFuel && this.input.isKeyPressed("w")) {
      this.activeVehicle.speed = Math.min(maxForwardSpeed, this.activeVehicle.speed + accel * deltaTime);
    } else if (this.input.isKeyPressed("s")) {
      this.activeVehicle.speed = Math.max(-maxForwardSpeed * 0.4, this.activeVehicle.speed - accel * deltaTime);
    } else {
      this.activeVehicle.speed *= 1 - Math.min(deltaTime * 2, 1);
      if (Math.abs(this.activeVehicle.speed) < 0.05) {
        this.activeVehicle.speed = 0;
      }
    }

    if (!hasFuel && Math.abs(this.activeVehicle.speed) < 0.1) {
      this.activeVehicle.speed = 0;
    }

    const turnScale = this.activeVehicle.speed === 0 ? 0 : Math.min(Math.abs(this.activeVehicle.speed) / maxForwardSpeed, 1);
    if (this.input.isKeyPressed("a")) {
      this.activeVehicle.facing -= TURN_RATE * deltaTime * turnScale;
    }
    if (this.input.isKeyPressed("d")) {
      this.activeVehicle.facing += TURN_RATE * deltaTime * turnScale;
    }

    const forward = this.forwardVector(this.activeVehicle.facing);
    this.activeVehicle.position.x += forward.x * this.activeVehicle.speed * deltaTime;
    this.activeVehicle.position.y += forward.y * this.activeVehicle.speed * deltaTime;
    this.player.syncToVehicle(this.activeVehicle.position);
    this.updateVehicleSystems(this.activeVehicle, deltaTime);
  }

  private updateVehicleSystems(vehicle: VehicleInstance, deltaTime: number): void {
    const { definition } = vehicle;
    const speedRatio = Math.abs(vehicle.speed) / Math.max(1, definition.speed_ms);
    const loadFactor = this.getCargoLoadFactor(vehicle);
    const burn = speedRatio * BASE_FUEL_BURN * (1 + loadFactor * 2);
    vehicle.fuelLiters = Math.max(0, vehicle.fuelLiters - burn * deltaTime);
    if (vehicle.fuelLiters <= 0.1 && vehicle.driver === "player") {
      this.setHint("Fuel depleted – press Y near a vehicle with a fuel can");
    }

    const wear = speedRatio * CONDITION_WEAR_RATE * (1 + loadFactor);
    vehicle.condition = Math.max(0, vehicle.condition - wear * deltaTime);

    vehicle.noiseCooldown -= deltaTime;
    if (vehicle.noiseCooldown <= 0 && (vehicle.driver || Math.abs(vehicle.speed) > 0.5)) {
      this.emitVehicleNoise(vehicle);
      vehicle.noiseCooldown = NOISE_INTERVAL;
    }
  }

  private handleInteract(): void {
    if (this.activeVehicle) {
      this.exitVehicle();
      return;
    }
    if (this.nearestVehicle) {
      this.enterVehicle(this.nearestVehicle);
    }
  }

  private enterVehicle(vehicle: VehicleInstance): void {
    if (vehicle.driver) {
      return;
    }
    this.activeVehicle = vehicle;
    vehicle.driver = "player";
    this.player.lockMovement("vehicle");
    this.player.syncToVehicle(vehicle.position);
    this.setHint(`Driving ${vehicle.definition.name} – E to exit · V for cargo`);
  }

  private exitVehicle(): void {
    if (!this.activeVehicle) {
      return;
    }
    this.activeVehicle.driver = null;
    this.activeVehicle.speed = 0;
    this.player.unlockMovement("vehicle");
    this.player.syncToVehicle({ ...this.activeVehicle.position });
    this.activeVehicle = null;
    this.closeCargoOverlay();
    this.closeMaintenance();
  }

  private findNearestVehicle(): VehicleInstance | null {
    let closest: VehicleInstance | null = null;
    let bestDistance = INTERACTION_RANGE;
    this.vehicles.forEach(vehicle => {
      if (vehicle.driver) {
        return;
      }
      const distance = Math.hypot(vehicle.position.x - this.player.position.x, vehicle.position.y - this.player.position.y);
      if (distance <= INTERACTION_RANGE && distance < bestDistance) {
        closest = vehicle;
        bestDistance = distance;
      }
    });
    return closest;
  }

  private toggleCargoOverlay(): void {
    if (this.cargoVisible) {
      this.closeCargoOverlay();
      return;
    }
    const target = this.getCargoTarget();
    if (!target) {
      this.setHint("No trailer cargo within range");
      return;
    }
    this.cargoVisible = true;
    this.cargoHud.setActions([]);
    const render = target.manifest.getRenderState();
    this.cargoHud.syncFromManifest(render, target.trailer.name);
    this.cargoHud.setHint(`V – Close · ${render.totalWeightKg.toFixed(0)} / ${render.capacityKg} kg loaded`);
    this.cargoHud.show();
  }

  private closeCargoOverlay(): void {
    this.cargoVisible = false;
    this.cargoHud.hide();
  }

  private refreshCargoHud(): void {
    if (!this.cargoVisible) {
      return;
    }
    const target = this.getCargoTarget();
    if (!target) {
      this.closeCargoOverlay();
      return;
    }
    const render = target.manifest.getRenderState();
    this.cargoHud.syncFromManifest(render, target.trailer.name);
    this.cargoHud.setHint(`V – Close · ${render.totalWeightKg.toFixed(0)} / ${render.capacityKg} kg loaded`);
    this.cargoHud.show();
  }

  private getCargoTarget(): { trailer: TrailerDefinition; manifest: CargoManifest } | null {
    if (this.activeVehicle?.manifest && this.activeVehicle.hitch?.current.trailer) {
      return { trailer: this.activeVehicle.hitch.current.trailer, manifest: this.activeVehicle.manifest };
    }
    for (const vehicle of this.vehicles) {
      if (!vehicle.manifest || !vehicle.hitch?.current.trailer) {
        continue;
      }
      const trailerPos = this.getTrailerPosition(vehicle);
      if (!trailerPos) {
        continue;
      }
      const distance = Math.hypot(trailerPos.x - this.player.position.x, trailerPos.y - this.player.position.y);
      if (distance <= TRAILER_RANGE) {
        return { trailer: vehicle.hitch.current.trailer, manifest: vehicle.manifest };
      }
    }
    return null;
  }

  private getTrailerPosition(vehicle: VehicleInstance): Vector2 | null {
    if (!vehicle.hitch?.current.attached || !vehicle.hitch.current.trailer) {
      return null;
    }
    const forward = this.forwardVector(vehicle.facing);
    return {
      x: vehicle.position.x - forward.x * TRAILER_OFFSET,
      y: vehicle.position.y - forward.y * TRAILER_OFFSET
    };
  }

  private forwardVector(angle: number): Vector2 {
    return { x: Math.sin(angle), y: -Math.cos(angle) };
  }

  private refreshHint(): void {
    if (this.activeVehicle) {
      this.setHint(`Driving ${this.activeVehicle.definition.name} – E to exit · V for cargo`);
      return;
    }
    if (this.nearestVehicle) {
      this.setHint(`E – Enter ${this.nearestVehicle.definition.name}`);
      return;
    }
    this.setHint("");
  }

  private toggleMaintenance(): void {
    if (this.maintenanceVisible) {
      this.closeMaintenance();
      return;
    }
    if (!this.activeVehicle) {
      this.setHint("Enter a vehicle before opening maintenance");
      return;
    }
    this.maintenanceVisible = true;
    this.updateMaintenancePanel(true);
  }

  private updateMaintenancePanel(force = false): void {
    if (!this.maintenanceVisible) {
      return;
    }
    if (!this.activeVehicle) {
      this.closeMaintenance();
      return;
    }
    if (!force && !this.maintenanceVisible) {
      return;
    }
    const vehicle = this.activeVehicle;
    const load = vehicle.manifest ? vehicle.manifest.getRenderState() : null;
    const statuses = [
      {
        component: "Fuel",
        condition: vehicle.fuelLiters / vehicle.fuelCapacity,
        tooltip: `${vehicle.fuelLiters.toFixed(1)} / ${vehicle.fuelCapacity} L`
      },
      {
        component: "Engine",
        condition: vehicle.condition,
        tooltip: vehicle.condition > 0.5 ? "Running smooth" : vehicle.condition > 0.2 ? "Needs service soon" : "Critical damage"
      },
      {
        component: "Cargo Load",
        condition: load ? load.totalWeightKg / load.capacityKg : 0,
        tooltip: load ? `${load.totalWeightKg.toFixed(0)} / ${load.capacityKg} kg` : "No trailer attached"
      }
    ];
    this.maintenance.show(vehicle.definition, statuses);
  }

  private closeMaintenance(): void {
    this.maintenanceVisible = false;
    this.maintenance.hide();
  }

  private tryRefuel(): void {
    const target = this.activeVehicle ?? this.nearestVehicle;
    if (!target) {
      this.setHint("No vehicle within range to refuel");
      return;
    }
    if (target.fuelLiters >= target.fuelCapacity - 0.5) {
      this.setHint("Tank already topped off");
      return;
    }
    const success = this.player.inventory.consumeItems([{ itemId: REFUEL_ITEM_ID, quantity: 1 }]);
    if (!success) {
      this.setHint("Need a fuel can in backpack to refuel");
      return;
    }
    target.fuelLiters = Math.min(target.fuelCapacity, target.fuelLiters + FUEL_PER_CAN);
    this.setHint(`Refueled ${target.definition.name} (+${FUEL_PER_CAN}L)`);
    if (this.maintenanceVisible) {
      this.updateMaintenancePanel(true);
    }
  }

  private emitVehicleNoise(vehicle: VehicleInstance): void {
    if (!this.noise) {
      return;
    }
    const classId = "noise_vehicle_idle";
    const intensity = Math.abs(vehicle.speed) > 0.5 ? vehicle.definition.noise_drive : vehicle.definition.noise_idle;
    const range = Math.max(intensity, 10);
    this.noise.emit(classId, { ...vehicle.position }, { intensity, range, duration: 1.1 });
  }

  private getCargoLoadFactor(vehicle: VehicleInstance): number {
    if (!vehicle.manifest) {
      return 0;
    }
    const render = vehicle.manifest.getRenderState();
    if (render.capacityKg <= 0) {
      return 0;
    }
    return render.totalWeightKg * MANIFEST_WEIGHT_IMPACT;
  }

  exportState(): VehicleSaveState[] {
    return this.vehicles.map(vehicle => ({
      id: vehicle.id,
      definitionId: vehicle.definition.id,
      position: { ...vehicle.position },
      facing: vehicle.facing,
      fuel: vehicle.fuelLiters,
      condition: vehicle.condition
    }));
  }

  importState(states: VehicleSaveState[] = []): void {
    states.forEach(state => {
      const vehicle = this.vehicles.find(entry => entry.id === state.id || entry.definition.id === state.definitionId);
      if (!vehicle) {
        return;
      }
      vehicle.position = { ...state.position };
      vehicle.facing = state.facing ?? 0;
      vehicle.fuelLiters = Math.max(0, Math.min(vehicle.fuelCapacity, state.fuel ?? vehicle.fuelCapacity));
      vehicle.condition = Math.min(1, Math.max(0, state.condition ?? 1));
    });
  }

  private setHint(text: string): void {
    this.hint.innerText = text;
    this.hint.style.display = text ? "block" : "none";
  }

  private seedDemoCargo(manifest: CargoManifest): void {
    const samples: CargoEntry[] = [
      {
        id: "cargo_sedan_shell",
        label: "Stored Sedan",
        condition: 82,
        weightKg: 1300,
        size: [3, 6]
      },
      {
        id: "cargo_crate_spares",
        label: "Crate – Spare Parts",
        condition: 100,
        weightKg: 120,
        size: [2, 2]
      },
      {
        id: "cargo_fuel_drum",
        label: "Fuel Drum",
        condition: 90,
        weightKg: 200,
        size: [2, 3]
      }
    ];
    samples.forEach(entry => {
      manifest.add(entry);
    });
  }
}
