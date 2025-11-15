import type { Player, Vector2 } from "../entities/Player";
import type { InputManager } from "../engine/Input";
import { content } from "../data";
import type { ContainerDefinition, PoiTemplateDefinition } from "../data/ContentRegistry";
import { Inventory, type SerializedInventory } from "../inventory/Inventory";
import type { ItemStack } from "../inventory/Item";
import { TransparentContainerHUD } from "../ui/TransparentContainerHUD";
import { LootGenerator } from "./LootGenerator";
import type { World } from "../worldgen/World";
import type { ChunkPoi } from "../worldgen/Chunk";
import { TILE_SIZE } from "../worldgen/Chunk";
import type { NoiseBus } from "../stealth/NoiseBus";

interface SpawnedContainer {
  id: string;
  definition: ContainerDefinition;
  inventory: Inventory;
  position: Vector2;
  lootTableId: string;
  respawnSeconds: number;
  respawnTimer: number;
  searchSeconds: number;
  searchProgress: number;
  forceProgress: number;
  forceSeconds: number;
  locked: boolean;
  initialLocked: boolean;
  lockDifficulty: number;
  lockpickActive: boolean;
  lockpickProgress: number;
  lockpickSeconds: number;
  isOpen: boolean;
}

interface ContainerSpawnOverrides {
  inventory?: SerializedInventory;
  respawnTimer?: number;
  locked?: boolean;
  isOpen?: boolean;
  initialLocked?: boolean;
}

export interface PersistedContainerState {
  definitionId: string;
  position: Vector2;
  lootTableId: string;
  respawnSeconds: number;
  respawnTimer: number;
  inventory: SerializedInventory;
  locked: boolean;
  isOpen: boolean;
}

export interface PersistedPoiState {
  poiId: string;
  containers: PersistedContainerState[];
}

const INTERACTION_RANGE = 140;
const POI_SYNC_RADIUS = 2;
const SECONDS_PER_IN_GAME_DAY = 60;
const LOCKPICK_ITEM_ID = "tool_lockpick";
const FORCE_NOISE_CLASS = "noise_container_force";
const MANUAL_SCENE_PREFIX = "manual_scene_";
const MANUAL_RESPAWN_SECONDS = SECONDS_PER_IN_GAME_DAY * 365;

let nextContainerId = 0;

export class WorldContainerManager {
  private readonly containers: SpawnedContainer[] = [];
  private readonly hud = new TransparentContainerHUD("Container");
  private readonly loot = new LootGenerator();
  private active: SpawnedContainer | null = null;
  private readonly poiScenes = new Map<string, string[]>();
  private readonly poiStates = new Map<string, PersistedPoiState>();
  private readonly containerToPoi = new Map<string, string>();
  private readonly templates: PoiTemplateDefinition[] = content.poi_templates;
  private readonly noise?: NoiseBus;
  private readonly manualScenes = new Set<string>();
  private manualSceneCounter = 0;

  constructor(
    private readonly player: Player,
    private readonly input: InputManager,
    private readonly viewport: { width: number; height: number },
    private readonly world: World,
    noise?: NoiseBus
  ) {
    this.noise = noise;
    this.hud.setActions([
      {
        label: "Loot All",
        title: "Transfer every stack into the backpack (E)",
        onClick: () => this.lootActiveContainer()
      }
    ]);
    this.input.on("interact", () => this.lootActiveContainer());
    this.input.on("lockpick", () => this.requestLockpick());
  }

  update(deltaTime: number): void {
    this.syncPoiScenes();
    this.containers.forEach(container => this.updateRespawn(container, deltaTime));
    const previousId = this.active?.id;
    this.active = this.findActiveContainer();
    if (previousId && previousId !== this.active?.id) {
      this.cancelProgress(previousId);
    }
    const holdingInteract = this.input.isKeyPressed("e");
    if (this.active) {
      this.processActiveContainer(this.active, deltaTime, holdingInteract);
      this.refreshHud(this.active, holdingInteract);
      this.hud.show();
    } else {
      this.hud.hide();
      this.hud.setHint("");
      this.hud.setStatus("");
    }
  }

  draw(ctx: CanvasRenderingContext2D, playerPosition: Vector2): void {
    const offsetX = playerPosition.x - this.viewport.width / 2;
    const offsetY = playerPosition.y - this.viewport.height / 2;

    this.containers.forEach(container => {
      const size = 48;
      const screenX = container.position.x - offsetX - size / 2;
      const screenY = container.position.y - offsetY - size / 2;
      ctx.save();
      ctx.fillStyle = "rgba(14, 165, 233, 0.35)";
      ctx.fillRect(screenX, screenY, size, size);
      ctx.strokeStyle = "rgba(125, 211, 252, 0.8)";
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(screenX, screenY, size, size);
      if (this.active?.id === container.id) {
        ctx.strokeStyle = "rgba(34, 197, 94, 0.95)";
        ctx.setLineDash([]);
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX - 4, screenY - 4, size + 8, size + 8);
      }
      ctx.restore();
    });
  }

  private spawnContainer(
    definitionId: string,
    position: Vector2,
    lootTableId: string,
    respawnSeconds: number,
    overrides: ContainerSpawnOverrides = {}
  ): SpawnedContainer | null {
    const definition = content.containers.find(container => container.id === definitionId);
    if (!definition) {
      console.warn(`Container definition ${definitionId} missing`);
      return null;
    }
    const inventory = new Inventory({
      columns: definition.grid[0],
      rows: definition.grid[1],
      weightLimitKg: definition.weight_limit_kg,
      allowRotation: true,
      label: definition.name
    });
    const lockDifficulty = definition.lock_difficulty ?? 1;
    const searchSeconds = definition.search_seconds ?? 0;
    const initialLocked = overrides.initialLocked ?? definition.locked ?? false;
    const container: SpawnedContainer = {
      id: `world_container_${nextContainerId += 1}`,
      definition,
      inventory,
      position,
      lootTableId,
      respawnSeconds,
      respawnTimer: overrides.respawnTimer ?? respawnSeconds,
      searchSeconds,
      searchProgress: 0,
      forceProgress: 0,
      forceSeconds: 2.5 + lockDifficulty * 1.5,
      locked: overrides.locked ?? initialLocked,
      initialLocked,
      lockDifficulty,
      lockpickActive: false,
      lockpickProgress: 0,
      lockpickSeconds: 1.5 + lockDifficulty * 0.75,
      isOpen: false
    };
    this.containers.push(container);
    if (overrides.inventory) {
      container.inventory.load(overrides.inventory);
      container.locked = overrides.locked ?? container.locked;
      container.isOpen = overrides.isOpen ?? (!container.locked && container.searchSeconds <= 0);
    } else {
      this.refill(container);
    }
    return container;
  }

  private findActiveContainer(): SpawnedContainer | null {
    let closest: SpawnedContainer | null = null;
    let bestDistance = INTERACTION_RANGE;
    for (const container of this.containers) {
      const distance = Math.hypot(
        container.position.x - this.player.position.x,
        container.position.y - this.player.position.y
      );
      if (distance <= INTERACTION_RANGE && distance < bestDistance) {
        closest = container;
        bestDistance = distance;
      }
    }
    return closest;
  }

  private cancelProgress(containerId: string): void {
    const container = this.containers.find(entry => entry.id === containerId);
    if (!container) return;
    container.forceProgress = 0;
    if (!container.locked) {
      container.searchProgress = 0;
    }
    if (container.lockpickActive) {
      container.lockpickActive = false;
      container.lockpickProgress = 0;
    }
  }

  private processActiveContainer(
    container: SpawnedContainer,
    deltaTime: number,
    holdingInteract: boolean
  ): void {
    let stateChanged = false;
    if (container.locked) {
      if (container.lockpickActive) {
        container.lockpickProgress += deltaTime;
        if (container.lockpickProgress >= container.lockpickSeconds) {
          container.lockpickActive = false;
          container.lockpickProgress = 0;
          container.locked = false;
          if (container.searchSeconds <= 0) {
            container.isOpen = true;
          } else {
            container.searchProgress = 0;
          }
          stateChanged = true;
        }
      } else if (holdingInteract) {
        container.forceProgress += deltaTime;
        if (container.forceProgress >= container.forceSeconds) {
          container.forceProgress = 0;
          container.locked = false;
          if (container.searchSeconds <= 0) {
            container.isOpen = true;
          } else {
            container.searchProgress = 0;
          }
          this.emitForceNoise(container);
          stateChanged = true;
        }
      } else {
        container.forceProgress = 0;
      }
    } else if (!container.isOpen && container.searchSeconds > 0) {
      if (holdingInteract) {
        container.searchProgress += deltaTime;
        if (container.searchProgress >= container.searchSeconds) {
          container.isOpen = true;
          container.searchProgress = 0;
          stateChanged = true;
        }
      } else {
        container.searchProgress = 0;
      }
    }

    if (stateChanged) {
      this.persistContainerState(container);
    }
  }

  private refreshHud(container: SpawnedContainer, holdingInteract: boolean): void {
    const [cols, rows] = container.definition.grid;
    if (!container.isOpen) {
      if (container.locked) {
        const lockpickPct = this.formatPercent(container.lockpickProgress, container.lockpickSeconds);
        const forcePct = this.formatPercent(container.forceProgress, container.forceSeconds);
        const placeholderText = container.lockpickActive
          ? `Lockpicking ${lockpickPct}%`
          : container.forceProgress > 0
            ? `Forcing Entry ${forcePct}%`
            : "Locked";
        this.hud.showPlaceholder(cols, rows, placeholderText);
        const hasKit = this.hasLockpickKit();
        if (container.lockpickActive) {
          this.hud.setHint("Lockpick in progress – stay nearby");
        } else if (holdingInteract) {
          this.hud.setHint("Forcing lock – release to cancel (loud)");
        } else {
          this.hud.setHint(
            hasKit
              ? "Press L to lockpick or hold E to force"
              : "Needs Lockpick Kit · hold E to force (loud)"
          );
        }
        this.hud.setStatus(`Lock difficulty ${container.lockDifficulty}`);
        return;
      }
      const searchPct = this.formatPercent(container.searchProgress, container.searchSeconds);
      const placeholderText = container.searchProgress > 0
        ? `Searching ${searchPct}%`
        : "Hold E to search";
      this.hud.showPlaceholder(cols, rows, placeholderText);
      this.hud.setHint(
        container.searchProgress > 0
          ? "Keep holding E to finish searching"
          : "Hold E to rummage through the stash"
      );
      this.hud.setStatus("Searching");
      return;
    }

    this.hud.syncFromInventory(container.inventory, container.definition.name);
    const stacks = container.inventory.getPlacedItems().length;
    this.hud.setStatus(`Open · ${stacks} stacks`);
    this.hud.setHint(`E – Loot All (${stacks} stacks remaining)`);
  }

  private requestLockpick(): void {
    if (!this.active || !this.active.locked || this.active.lockpickActive) {
      return;
    }
    if (!this.hasLockpickKit()) {
      this.hud.setHint("Need a Lockpick Kit in your backpack");
      return;
    }
    this.active.lockpickActive = true;
    this.active.lockpickProgress = 0;
    this.hud.setHint("Lockpicking… stay within range");
  }

  private hasLockpickKit(): boolean {
    return this.player.inventory.getQuantity(LOCKPICK_ITEM_ID) > 0;
  }

  private persistContainerState(container: SpawnedContainer): void {
    const poiId = this.containerToPoi.get(container.id);
    if (poiId) {
      this.capturePoiState(poiId);
    }
  }

  private resetContainerState(container: SpawnedContainer): void {
    container.locked = container.initialLocked;
    container.isOpen = !container.locked && container.searchSeconds <= 0;
    container.searchProgress = 0;
    container.forceProgress = 0;
    container.lockpickActive = false;
    container.lockpickProgress = 0;
  }

  private emitForceNoise(container: SpawnedContainer): void {
    if (!this.noise) return;
    this.noise.emit(FORCE_NOISE_CLASS, { ...container.position });
  }

  private formatPercent(progress: number, total: number): number {
    if (total <= 0) return 100;
    return Math.min(100, Math.round((progress / total) * 100));
  }

  private lootActiveContainer(): void {
    if (!this.active) {
      return;
    }
    if (!this.active.isOpen) {
      this.hud.setHint(
        this.active.locked
          ? "Locked – pick the lock (L) or force with E"
          : "Hold E to finish searching before looting"
      );
      return;
    }
    const stacks = [...this.active.inventory.getPlacedItems()];
    let movedQuantity = 0;
    let partialTransfer = false;
    stacks.forEach(item => {
      const copy: ItemStack = {
        ...item.stack,
        attachments: item.stack.attachments ? { ...item.stack.attachments } : undefined
      };
      const result = this.player.inventory.add({ ...copy });
      if (result.accepted > 0) {
        this.active?.inventory.removePlacedItem(item.id);
        movedQuantity += result.accepted;
        if (result.remainder > 0) {
          partialTransfer = true;
          const leftover: ItemStack = {
            ...copy,
            quantity: result.remainder
          };
          if (this.active) {
            const restore = this.active.inventory.add(leftover);
            if (restore.accepted === 0) {
              console.warn(`Failed to restore leftover stack (${copy.itemId}) to container ${this.active.id}`);
            }
          }
        }
      }
    });
    if (movedQuantity === 0) {
      this.hud.setHint("Backpack full – free space to loot");
    } else {
      const suffix = partialTransfer ? " · Some stacks remain due to weight limits" : "";
      this.hud.setHint(`Transferred ${movedQuantity} items${suffix}`);
    }
    this.refreshHud(this.active, this.input.isKeyPressed("e"));
    const poiId = this.active ? this.containerToPoi.get(this.active.id) : null;
    if (poiId) {
      this.capturePoiState(poiId);
    }
  }

  private updateRespawn(container: SpawnedContainer, deltaTime: number): void {
    if (container.inventory.getPlacedItems().length > 0) {
      container.respawnTimer = container.respawnSeconds;
      return;
    }
    container.respawnTimer -= deltaTime;
    if (container.respawnTimer <= 0) {
      this.refill(container);
    }
  }

  private refill(container: SpawnedContainer): void {
    this.resetContainerState(container);
    const stacks = this.loot.roll(container.lootTableId, { rolls: 4 });
    stacks.forEach(stack => {
      const result = container.inventory.add({ ...stack });
      if (result.accepted === 0) {
        console.warn(`Container ${container.id} out of space for ${stack.itemId}`);
      } else if (!result.success) {
        console.warn(`Container ${container.id} trimmed ${result.remainder}x ${stack.itemId} due to space limits`);
      }
    });
    container.respawnTimer = container.respawnSeconds;
    const poiId = this.containerToPoi.get(container.id);
    if (poiId) {
      this.capturePoiState(poiId);
    }
  }

  private capturePoiState(poiId: string): void {
    const containerIds = this.poiScenes.get(poiId);
    if (!containerIds) {
      return;
    }
    const containers = containerIds
      .map(id => this.containers.find(container => container.id === id))
      .filter((container): container is SpawnedContainer => Boolean(container))
      .map(container => ({
        definitionId: container.definition.id,
        position: { ...container.position },
        lootTableId: container.lootTableId,
        respawnSeconds: container.respawnSeconds,
        respawnTimer: container.respawnTimer,
        inventory: container.inventory.serialize(),
        locked: container.locked,
        isOpen: container.isOpen
      }));
    if (containers.length > 0) {
      this.poiStates.set(poiId, { poiId, containers });
    }
  }

  private syncPoiScenes(): void {
    const visiblePois = this.world.getPoisNear(this.player.position, POI_SYNC_RADIUS);
    const visibleIds = new Set(visiblePois.map((poi) => poi.id));
    this.manualScenes.forEach(id => visibleIds.add(id));

    for (const poiId of Array.from(this.poiScenes.keys())) {
      if (!visibleIds.has(poiId)) {
        this.destroyScene(poiId);
      }
    }

    visiblePois.forEach((poi) => {
      if (!this.poiScenes.has(poi.id)) {
        this.spawnSceneForPoi(poi);
      }
    });
  }

  private spawnSceneForPoi(poi: ChunkPoi): void {
    const template = this.resolveTemplate(poi);
    const respawnSeconds = this.convertRespawnToSeconds(poi.respawnDays);
    const spawnedIds: string[] = [];
    const persisted = this.poiStates.get(poi.id);

    if (persisted) {
      persisted.containers.forEach(containerState => {
        const container = this.spawnContainer(
          containerState.definitionId,
          containerState.position,
          containerState.lootTableId,
          containerState.respawnSeconds,
          {
            inventory: containerState.inventory,
            respawnTimer: containerState.respawnTimer,
            locked: containerState.locked,
            isOpen: containerState.isOpen
          }
        );
        if (container) {
          spawnedIds.push(container.id);
        }
      });
    } else if (template) {
      template.containers.forEach(placement => {
        const position = this.offsetToWorld(poi, placement.offset);
        const overrides: ContainerSpawnOverrides = {};
        if (typeof placement.locked === "boolean") {
          overrides.initialLocked = placement.locked;
          overrides.locked = placement.locked;
        }
        const container = this.spawnContainer(
          placement.container_id,
          position,
          placement.loot_table ?? poi.lootTable,
          respawnSeconds,
          overrides
        );
        if (container) {
          spawnedIds.push(container.id);
        }
      });
    }

    if (spawnedIds.length === 0) {
      const fallback = this.spawnContainer(
        "container_world_crate_large",
        this.centerOfPoi(poi),
        poi.lootTable,
        respawnSeconds
      );
      if (fallback) {
        spawnedIds.push(fallback.id);
      }
    }

    if (spawnedIds.length > 0) {
      this.poiScenes.set(poi.id, spawnedIds);
      spawnedIds.forEach(id => this.containerToPoi.set(id, poi.id));
      this.capturePoiState(poi.id);
    }
  }

  private destroyScene(poiId: string): void {
    const containerIds = this.poiScenes.get(poiId);
    if (!containerIds) return;
    this.capturePoiState(poiId);
    containerIds.forEach((id) => this.removeContainerById(id));
    this.poiScenes.delete(poiId);
    if (this.manualScenes.has(poiId)) {
      this.manualScenes.delete(poiId);
    }
  }

  private removeContainerById(id: string): void {
    const index = this.containers.findIndex((container) => container.id === id);
    if (index === -1) return;
    this.containers.splice(index, 1);
    this.containerToPoi.delete(id);
    if (this.active?.id === id) {
      this.active = null;
      this.hud.hide();
    }
  }

  private resolveTemplate(poi: ChunkPoi): PoiTemplateDefinition | undefined {
    if (poi.templateId) {
      return this.templates.find((template) => template.id === poi.templateId);
    }
    return this.templates.find((template) => template.applies_to.includes(poi.typeId));
  }

  private offsetToWorld(poi: ChunkPoi, offset: [number, number]): Vector2 {
    return {
      x: poi.worldPosition.x + offset[0] * TILE_SIZE,
      y: poi.worldPosition.y + offset[1] * TILE_SIZE
    };
  }

  private centerOfPoi(poi: ChunkPoi): Vector2 {
    return {
      x: poi.worldPosition.x + (poi.size[0] * TILE_SIZE) / 2,
      y: poi.worldPosition.y + (poi.size[1] * TILE_SIZE) / 2
    };
  }

  private convertRespawnToSeconds(range: [number, number]): number {
    const avgDays = (range[0] + range[1]) / 2;
    return Math.max(90, avgDays * SECONDS_PER_IN_GAME_DAY);
  }

  exportState(): PersistedPoiState[] {
    this.poiScenes.forEach((_value, poiId) => this.capturePoiState(poiId));
    return [...this.poiStates.values()].map(state => ({
      poiId: state.poiId,
      containers: state.containers.map(container => ({
        definitionId: container.definitionId,
        position: { ...container.position },
        lootTableId: container.lootTableId,
        respawnSeconds: container.respawnSeconds,
        respawnTimer: container.respawnTimer,
        inventory: this.cloneInventory(container.inventory),
        locked: container.locked,
        isOpen: container.isOpen
      }))
    }));
  }

  importState(states: PersistedPoiState[]): void {
    this.clearRuntimeContainers();
    this.poiStates.clear();
    this.manualScenes.clear();
    states.forEach(state => {
      this.poiStates.set(state.poiId, {
        poiId: state.poiId,
        containers: state.containers.map(container => ({
          definitionId: container.definitionId,
          position: { ...container.position },
          lootTableId: container.lootTableId,
          respawnSeconds: container.respawnSeconds,
          respawnTimer: container.respawnTimer,
          inventory: this.cloneInventory(container.inventory),
          locked: container.locked,
          isOpen: container.isOpen
        }))
      });
    });
    states.forEach(state => {
      if (state.poiId.startsWith(MANUAL_SCENE_PREFIX)) {
        this.instantiateManualScene(state.poiId);
      }
    });
  }

  private clearRuntimeContainers(): void {
    this.containers.splice(0, this.containers.length);
    this.poiScenes.clear();
    this.containerToPoi.clear();
    this.active = null;
    this.hud.hide();
    this.manualScenes.clear();
  }

  private cloneInventory(inventory: SerializedInventory): SerializedInventory {
    return {
      ...inventory,
      items: inventory.items.map(item => ({
        stack: {
          ...item.stack,
          attachments: item.stack.attachments ? { ...item.stack.attachments } : undefined
        },
        position: { ...item.position },
        rotated: item.rotated
      }))
    };
  }

  spawnRewardCache(stacks: ItemStack[], label = "Ambush Loot"): string | null {
    if (stacks.length === 0) {
      return null;
    }
    const dropPosition: Vector2 = {
      x: this.player.position.x + 120,
      y: this.player.position.y - 40
    };
    const sceneId = `${MANUAL_SCENE_PREFIX}${(this.manualSceneCounter += 1)}`;
    const container = this.spawnContainer(
      "container_world_crate_large",
      dropPosition,
      "loot_residential_t1",
      MANUAL_RESPAWN_SECONDS,
      {
        locked: false,
        initialLocked: false,
        respawnTimer: MANUAL_RESPAWN_SECONDS,
        isOpen: true
      }
    );
    if (!container) {
      return null;
    }
    container.inventory.grid.clear();
    stacks.forEach(stack => {
      const result = container.inventory.add({ ...stack });
      if (result.accepted === 0) {
        console.warn(`Reward cache full – unable to store ${stack.itemId}`);
      } else if (!result.success) {
        console.warn(`Reward cache trimmed ${result.remainder}x ${stack.itemId}`);
      }
    });
    container.locked = false;
    container.initialLocked = false;
    container.searchSeconds = 0;
    container.isOpen = true;
    this.manualScenes.add(sceneId);
    this.poiScenes.set(sceneId, [container.id]);
    this.containerToPoi.set(container.id, sceneId);
    this.capturePoiState(sceneId);
    this.hud.setStatus(`${label} spawned nearby`);
    this.hud.setHint("Approach crate and hold E to loot");
    return sceneId;
  }

  private instantiateManualScene(poiId: string): void {
    const state = this.poiStates.get(poiId);
    if (!state) {
      return;
    }
    const spawnedIds: string[] = [];
    state.containers.forEach(containerState => {
      const container = this.spawnContainer(
        containerState.definitionId,
        containerState.position,
        containerState.lootTableId,
        containerState.respawnSeconds,
        {
          inventory: containerState.inventory,
          respawnTimer: containerState.respawnTimer,
          locked: containerState.locked,
          isOpen: containerState.isOpen,
          initialLocked: containerState.locked
        }
      );
      if (container) {
        spawnedIds.push(container.id);
      }
    });
    if (spawnedIds.length > 0) {
      this.manualScenes.add(poiId);
      this.poiScenes.set(poiId, spawnedIds);
      spawnedIds.forEach(id => this.containerToPoi.set(id, poiId));
    }
  }
}
