import type { InputManager } from "../engine/Input";
import type { Player } from "../entities/Player";
import type { BuildingController } from "./BuildingController";
import type { SurvivorController } from "../survivors/SurvivorController";
import type { FacilityPersistenceState, FacilityView } from "./FacilityManager";
import { FacilityManager } from "./FacilityManager";
import { FacilityPanel } from "../ui/FacilityPanel";

const UPDATE_INTERVAL = 1; // seconds

export class FacilityController {
  private readonly manager: FacilityManager;
  private readonly panel: FacilityPanel;
  private accumulator = 0;
  private lastMessage: { text: string; error: boolean } | null = null;

  constructor(
    private readonly player: Player,
    private readonly building: BuildingController,
    private readonly survivors: SurvivorController,
    private readonly input: InputManager
  ) {
    this.manager = new FacilityManager(this.building.getManager(), this.player.inventory);
    this.panel = new FacilityPanel({
      onBuild: facilityId => this.startBuild(facilityId),
      onUpgrade: facilityId => this.handleUpgrade(facilityId)
    });

    this.input.on("toggle-facilities", () => this.toggle());
  }

  update(deltaSeconds: number): void {
    this.accumulator += deltaSeconds;
    if (this.accumulator < UPDATE_INTERVAL) {
      return;
    }
    const jobStats = this.survivors.getJobStats();
    this.manager.update(this.accumulator, jobStats);
    this.accumulator = 0;
    if (this.panel.isOpen()) {
      this.syncPanel();
    }
  }

  toggle(force?: boolean): void {
    const shouldOpen = force ?? !this.panel.isOpen();
    if (shouldOpen) {
      this.syncPanel();
      this.panel.show();
    } else {
      this.panel.hide();
    }
  }

  getFacilities(): FacilityView[] {
    return this.manager.getFacilities();
  }

  getStockpileTotals() {
    return this.manager.getStockpileSnapshot();
  }

  getStockpileValue(): number {
    return this.manager.getStockpileValue();
  }

  exportState(): FacilityPersistenceState {
    return this.manager.serialize();
  }

  importState(state?: FacilityPersistenceState): void {
    this.manager.load(state);
    if (this.panel.isOpen()) {
      this.syncPanel();
    }
  }

  private syncPanel(): void {
    const definitions = this.manager.getDefinitions();
    const facilities = this.manager.getFacilities();
    const builtIds = new Set(facilities.map(facility => facility.definition.id));
    const available = definitions.filter(def => !builtIds.has(def.id));
    this.panel.setData({
      available,
      facilities,
      stockpile: this.manager.getStockpileSnapshot(),
      message: this.lastMessage ?? undefined
    });
  }

  private startBuild(facilityId: string): void {
    const result = this.manager.beginConstruction(facilityId);
    this.lastMessage = result.success
      ? { text: "Construction queued", error: false }
      : { text: result.error ?? "Unable to build", error: true };
    this.syncPanel();
  }

  private handleUpgrade(facilityId: string): void {
    const result = this.manager.upgradeFacility(facilityId);
    this.lastMessage = result.success
      ? { text: "Upgrade in progress", error: false }
      : { text: result.error ?? "Unable to upgrade", error: true };
    this.syncPanel();
  }
}
