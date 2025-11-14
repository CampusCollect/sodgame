import type { Player, Vector2 } from "../entities/Player";
import type { World } from "../worldgen/World";
import type { VehicleDefinition, TrailerDefinition } from "../data/ContentRegistry";
import { content } from "../data";
import { TrailerHitch } from "./TrailerHitch";
import { CargoManifest, type CargoEntry } from "./CargoManifest";
import type { InputManager } from "../engine/Input";
import { TransparentCargoHUD } from "../ui/TransparentCargoHUD";

interface VehicleInstance {
  id: string;
  definition: VehicleDefinition;
  position: Vector2;
  facing: number;
  speed: number;
  driver: "player" | null;
  hitch?: TrailerHitch;
  manifest?: CargoManifest;
}

const INTERACTION_RANGE = 110;
const TRAILER_RANGE = 160;
const TURN_RATE = Math.PI;
const TRAILER_OFFSET = 140;

export class VehicleDirector {
  private readonly vehicles: VehicleInstance[] = [];
  private readonly cargoHud = new TransparentCargoHUD("Trailer Cargo");
  private readonly hint: HTMLDivElement;
  private activeVehicle: VehicleInstance | null = null;
  private nearestVehicle: VehicleInstance | null = null;
  private cargoVisible = false;

  constructor(private readonly player: Player, private readonly input: InputManager) {
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
        driver: null
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
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2): void {
    const offset: Vector2 = {
      x: playerPosition.x - window.innerWidth / 2,
      y: playerPosition.y - window.innerHeight / 2
    };

    this.vehicles.forEach(vehicle => {
      const def = content.vehicles.find(v => v.id === vehicle.definitionId);
      if (!def) return;

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
    const accel = definition.speed_ms * 1.5;
    if (this.input.isKeyPressed("w")) {
      this.activeVehicle.speed = Math.min(definition.speed_ms, this.activeVehicle.speed + accel * deltaTime);
    } else if (this.input.isKeyPressed("s")) {
      this.activeVehicle.speed = Math.max(-definition.speed_ms * 0.4, this.activeVehicle.speed - accel * deltaTime);
    } else {
      this.activeVehicle.speed *= 1 - Math.min(deltaTime * 2, 1);
      if (Math.abs(this.activeVehicle.speed) < 0.05) {
        this.activeVehicle.speed = 0;
      }
    }

    const turnScale = this.activeVehicle.speed === 0 ? 0 : Math.min(Math.abs(this.activeVehicle.speed) / definition.speed_ms, 1);
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
    this.player.lockMovement();
    this.player.syncToVehicle(vehicle.position);
    this.setHint(`Driving ${vehicle.definition.name} – E to exit · V for cargo`);
  }

  private exitVehicle(): void {
    if (!this.activeVehicle) {
      return;
    }
    this.activeVehicle.driver = null;
    this.activeVehicle.speed = 0;
    this.player.unlockMovement();
    this.player.syncToVehicle({ ...this.activeVehicle.position });
    this.activeVehicle = null;
    this.closeCargoOverlay();
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
