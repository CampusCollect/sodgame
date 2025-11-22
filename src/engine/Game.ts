import { World } from "../worldgen/World";
import { Player } from "../entities/Player";
import { InputManager } from "./Input";
import { Hud } from "../ui/Hud";
import { InventoryController } from "../inventory/InventoryController";
import { ZombieDirector } from "../ai/ZombieDirector";
import { VehicleDirector } from "../vehicles/VehicleDirector";
import { CraftingController } from "../crafting/CraftingController";
import { BuildingController } from "../building/BuildingController";
import { FacilityController } from "../building/FacilityController";
import { SurvivorController } from "../survivors/SurvivorController";
import { FactionController } from "../factions/FactionController";
import { WorldContainerManager } from "../loot/WorldContainerManager";
import { StealthController } from "../stealth/StealthController";
import { ProgressionController } from "../progression/ProgressionController";
import { SaveManager } from "../persistence/SaveManager";
import { CombatController } from "../combat/CombatController";
import { WeaponModController } from "../combat/WeaponModController";
import { PlayerVitals } from "../combat/PlayerVitals";
import { UnifiedOverlay } from "../ui/UnifiedOverlay";
import { EquipmentManager } from "../inventory/EquipmentManager";
import { MapPanel } from "../ui/MapPanel";

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
  readonly overlay: UnifiedOverlay;
  readonly hud: Hud;
  readonly inventory: InventoryController;
  readonly stealth: StealthController;
  readonly zombies: ZombieDirector;
  readonly vehicles: VehicleDirector;
  readonly crafting: CraftingController;
  readonly building: BuildingController;
  readonly facilities: FacilityController;
  readonly survivors: SurvivorController;
  readonly factions: FactionController;
  readonly containers: WorldContainerManager;
  readonly progression: ProgressionController;
  readonly saves: SaveManager;
  readonly combat: CombatController;
  readonly weaponMods: WeaponModController;
  readonly vitals: PlayerVitals;
  readonly equipment: EquipmentManager;
  readonly mapPanel: MapPanel;

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
    this.overlay = new UnifiedOverlay(this.input);
    this.equipment = new EquipmentManager(this.player.inventory);
    this.vitals = new PlayerVitals(this.player, this.player.inventory, this.input, this.equipment);
    this.stealth = new StealthController(this.player, this.input);
    this.zombies = new ZombieDirector(this.vitals, this.stealth.getNoise());
    this.combat = new CombatController(this.player, this.input, this.zombies, this.stealth);
    this.inventory = new InventoryController(this.player.inventory, this.input, this.overlay, this.equipment, {
      onReloadRequest: () => this.combat.manualReload()
    });
    this.hud = new Hud(this.player, this.inventory);
    this.vehicles = new VehicleDirector(this.player, this.input, this.overlay, this.stealth.getNoise());
    this.crafting = new CraftingController(this.player.inventory, this.input, this.overlay);
    this.building = new BuildingController(this.player, this.input, options.canvas, {
      width: options.width,
      height: options.height
    }, this.overlay);
    this.survivors = new SurvivorController(this.input, this.overlay);
    this.facilities = new FacilityController(this.player, this.building, this.survivors, this.overlay);
    this.containers = new WorldContainerManager(
      this.player,
      this.input,
      {
        width: options.width,
        height: options.height
      },
      this.world,
      this.stealth.getNoise()
    );
    this.factions = new FactionController(this.input, this.player, this.containers, this.overlay);
    this.progression = new ProgressionController(
      this.player,
      this.building,
      this.survivors,
      this.zombies,
      this.facilities
    );
    this.mapPanel = new MapPanel();
    this.overlay.registerTab({
      id: "map",
      label: "Map",
      icon: "\uD83D\uDDFA\uFE0F",
      hotkeys: ["toggle-map"],
      element: this.mapPanel.getElement(),
      onOpen: () => this.mapPanel.open(),
      onClose: () => this.mapPanel.close()
    });
    this.saves = new SaveManager({
      player: this.player,
      building: this.building,
      facilities: this.facilities,
      containers: this.containers,
      progression: this.progression,
      input: this.input,
      vitals: this.vitals,
      vehicles: this.vehicles,
      equipment: this.equipment
    });
    this.weaponMods = new WeaponModController(this.player, this.combat, this.overlay);
    this.saves.tryResume();
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
    this.world.update(deltaTime, this.player.position);
    this.player.update(deltaTime, this.input, this.world);
    this.vitals.update(deltaTime);
    this.stealth.update(deltaTime);
    this.zombies.update(deltaTime, this.world, this.player);
    this.vehicles.update(deltaTime, this.world, this.player);
    this.crafting.update(deltaTime);
    this.building.update();
    this.facilities.update(deltaTime);
    this.survivors.update(deltaTime);
    this.factions.update(deltaTime);
    this.containers.update(deltaTime);
    this.combat.update(deltaTime, { width: this.options.width, height: this.options.height });
    this.weaponMods.update();
    const progressionSummary = this.progression.update(deltaTime);
    this.mapPanel.setData({
      position: { ...this.player.position },
      pois: this.world.getPoisNear(this.player.position, 2),
      progression: progressionSummary
    });
    this.hud.update(
      deltaTime,
      progressionSummary,
      this.combat.getWeaponStatus(),
      this.vitals.getHudState(),
      this.facilities.getStockpileTotals()
    );
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.options.width, this.options.height);
    this.world.draw(this.ctx, this.player.position, {
      width: this.options.width,
      height: this.options.height
    });
    this.building.draw(this.ctx, this.player.position);
    this.containers.draw(this.ctx, this.player.position);
    this.vehicles.draw(this.ctx, this.player.position);
    this.player.draw(this.ctx, this.options.width, this.options.height);
    this.zombies.draw(this.ctx, this.player.position);
    this.combat.draw(this.ctx, this.player.position, { width: this.options.width, height: this.options.height });
    this.hud.drawOverlay(this.ctx, this.options);
  }
}
