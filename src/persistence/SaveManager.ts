import type { Player, PlayerStateSnapshot } from "../entities/Player";
import type { BuildingController } from "../building/BuildingController";
import type { FacilityController } from "../building/FacilityController";
import type { WorldContainerManager, PersistedPoiState } from "../loot/WorldContainerManager";
import type { ProgressionController, ProgressionPersistenceState } from "../progression/ProgressionController";
import type { SerializedStructurePlacement } from "../building/BuildingManager";
import type { InputManager } from "../engine/Input";
import type { PlayerVitals, PlayerVitalsSnapshot } from "../combat/PlayerVitals";
import type { FacilityPersistenceState } from "../building/FacilityManager";
import type { VehicleDirector, VehicleSaveState } from "../vehicles/VehicleDirector";

interface SavePayload {
  version: number;
  timestamp: number;
  player: PlayerStateSnapshot;
  structures: SerializedStructurePlacement[];
  facilities?: FacilityPersistenceState;
  containers: PersistedPoiState[];
  progression: ProgressionPersistenceState;
  vitals?: PlayerVitalsSnapshot;
  vehicles?: VehicleSaveState[];
}

const STORAGE_KEY = "sodgame.save.v1";
const TOAST_DURATION_MS = 3500;

interface SaveManagerDeps {
  player: Player;
  building: BuildingController;
  facilities: FacilityController;
  containers: WorldContainerManager;
  progression: ProgressionController;
  input: InputManager;
  vitals: PlayerVitals;
  vehicles: VehicleDirector;
}

export class SaveManager {
  private readonly toast: HTMLDivElement;
  private hideHandle: number | null = null;

  constructor(private readonly deps: SaveManagerDeps) {
    this.toast = document.createElement("div");
    this.toast.className = "save-toast";
    document.body.append(this.toast);
    this.hideToast();

    deps.input.on("quick-save", () => this.quickSave());
    deps.input.on("quick-load", () => this.quickLoad());
  }

  tryResume(): void {
    const payload = this.read();
    if (payload) {
      this.apply(payload);
      this.showToast("Previous session loaded (F5 to save, F9 to reload)");
    } else {
      this.showToast("New session – press F5 to quick-save");
    }
  }

  quickSave(): void {
    const payload = this.capture();
    if (!payload) {
      this.showToast("Unable to save – missing state");
      return;
    }
    this.write(payload);
    this.showToast("Progress saved");
  }

  quickLoad(): void {
    const payload = this.read();
    if (!payload) {
      this.showToast("No save found – press F5 first");
      return;
    }
    this.apply(payload);
    this.showToast("Save loaded");
  }

  private capture(): SavePayload | null {
    try {
      return {
        version: 1,
        timestamp: Date.now(),
        player: this.deps.player.serialize(),
        structures: this.deps.building.exportState(),
        facilities: this.deps.facilities.exportState(),
        containers: this.deps.containers.exportState(),
        progression: this.deps.progression.exportState(),
        vitals: this.deps.vitals.serialize(),
        vehicles: this.deps.vehicles.exportState()
      };
    } catch (error) {
      console.error("Failed to capture save payload", error);
      return null;
    }
  }

  private apply(payload: SavePayload): void {
    this.deps.player.load(payload.player);
    this.deps.building.importState(payload.structures ?? []);
    this.deps.facilities.importState(payload.facilities);
    this.deps.containers.importState(payload.containers ?? []);
    if (payload.progression) {
      this.deps.progression.loadState(payload.progression);
    }
    this.deps.vitals.load(payload.vitals);
    if (payload.vehicles) {
      this.deps.vehicles.importState(payload.vehicles);
    }
  }

  private write(payload: SavePayload): void {
    try {
      this.storage()?.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to write save payload", error);
      this.showToast("Failed to access browser storage");
    }
  }

  private read(): SavePayload | null {
    try {
      const raw = this.storage()?.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as SavePayload;
    } catch (error) {
      console.error("Failed to read save payload", error);
      return null;
    }
  }

  private storage() {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  }

  private showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.add("visible");
    if (this.hideHandle) {
      window.clearTimeout(this.hideHandle);
    }
    this.hideHandle = window.setTimeout(() => this.hideToast(), TOAST_DURATION_MS);
  }

  private hideToast(): void {
    this.toast.classList.remove("visible");
  }
}
