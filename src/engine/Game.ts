import { World } from "../worldgen/World";
import { Player } from "../entities/Player";
import { InputManager } from "./Input";
import { Hud } from "../ui/Hud";
import { InventoryController } from "../inventory/InventoryController";
import { ZombieDirector } from "../ai/ZombieDirector";
import { VehicleDirector } from "../vehicles/VehicleDirector";
import { CraftingController } from "../crafting/CraftingController";
import { BuildingController } from "../building/BuildingController";
import { SurvivorController } from "../survivors/SurvivorController";
import { FactionController } from "../factions/FactionController";
import { WorldContainerManager } from "../loot/WorldContainerManager";
import { StealthController } from "../stealth/StealthController";

export interface GameOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  readonly world: World;
  readonly player: Player;
  readonly input: InputManager;
  readonly hud: Hud;
  readonly inventory: InventoryController;
  readonly stealth: StealthController;
  readonly zombies: ZombieDirector;
  readonly vehicles: VehicleDirector;
  readonly crafting: CraftingController;
  readonly building: BuildingController;
  readonly survivors: SurvivorController;
  readonly factions: FactionController;
  readonly containers: WorldContainerManager;

  private lastFrame = performance.now();
  private animationHandle: number | null = null;

  constructor(private readonly options: GameOptions) {
    const context = options.canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to initialize canvas context");
    }
    this.ctx = context;
    options.canvas.width = options.width;
    options.canvas.height = options.height;

    this.world = new World();
    this.player = new Player({ x: 0, y: 0 });
    this.input = new InputManager(options.canvas);
    this.inventory = new InventoryController(this.player.inventory, this.input);
    this.hud = new Hud(this.player, this.inventory);
    this.stealth = new StealthController(this.player, this.input);
    this.zombies = new ZombieDirector(this.stealth.getNoise());
    this.vehicles = new VehicleDirector(this.player, this.input);
    this.crafting = new CraftingController(this.player.inventory, this.input);
    this.building = new BuildingController(this.player, this.input, options.canvas, {
      width: options.width,
      height: options.height
    });
    this.survivors = new SurvivorController(this.input);
    this.factions = new FactionController(this.input);
    this.containers = new WorldContainerManager(this.player, this.input, {
      width: options.width,
      height: options.height
    });

    this.configureInput();
  }

  private configureInput(): void {
    this.input.on("toggle-inventory", () => {
      this.inventory.toggle();
    });
  }

  start(): void {
    const loop = (timestamp: number) => {
      const delta = (timestamp - this.lastFrame) / 1000;
      this.lastFrame = timestamp;
      this.update(delta);
      this.draw();
      this.animationHandle = requestAnimationFrame(loop);
    };

    this.animationHandle = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animationHandle !== null) {
      cancelAnimationFrame(this.animationHandle);
      this.animationHandle = null;
    }
  }

  private update(deltaTime: number): void {
    this.input.update();
    this.world.update(deltaTime);
    this.player.update(deltaTime, this.input, this.world);
    this.stealth.update(deltaTime);
    this.zombies.update(deltaTime, this.world, this.player);
    this.vehicles.update(deltaTime, this.world, this.player);
    this.crafting.update(deltaTime);
    this.building.update();
    this.survivors.update(deltaTime);
    this.factions.update(deltaTime);
    this.containers.update(deltaTime);
    this.hud.update(deltaTime);
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.options.width, this.options.height);
    this.world.draw(this.ctx, this.player.position);
    this.building.draw(this.ctx, this.player.position);
    this.containers.draw(this.ctx, this.player.position);
    this.vehicles.draw(this.ctx, this.player.position);
    this.player.draw(this.ctx, this.options.width, this.options.height);
    this.zombies.draw(this.ctx, this.player.position);
    this.hud.drawOverlay(this.ctx, this.options);
  }
}
