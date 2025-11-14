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

interface SpawnedContainer {
  id: string;
  definition: ContainerDefinition;
  inventory: Inventory;
  position: Vector2;
  lootTableId: string;
  respawnSeconds: number;
  respawnTimer: number;
}

export interface PersistedContainerState {
  definitionId: string;
  position: Vector2;
  lootTableId: string;
  respawnSeconds: number;
  respawnTimer: number;
  inventory: SerializedInventory;
}

export interface PersistedPoiState {
  poiId: string;
  containers: PersistedContainerState[];
}

const INTERACTION_RANGE = 140;
const POI_SYNC_RADIUS = 2;
const SECONDS_PER_IN_GAME_DAY = 60;

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

  constructor(
    private readonly player: Player,
    private readonly input: InputManager,
    private readonly viewport: { width: number; height: number },
    private readonly world: World
  ) {
    this.hud.setActions([
      {
        label: "Loot All",
        title: "Transfer every stack into the backpack (E)",
        onClick: () => this.lootActiveContainer()
      }
    ]);
    this.input.on("interact", () => this.lootActiveContainer());
  }

  update(deltaTime: number): void {
    this.syncPoiScenes();
    this.containers.forEach(container => this.updateRespawn(container, deltaTime));
    const previous = this.active?.id;
    this.active = this.findActiveContainer();
    if (this.active) {
      if (this.active.id !== previous) {
        this.syncHud();
      } else {
        this.hud.syncFromInventory(this.active.inventory, this.active.definition.name);
      }
      const stacks = this.active.inventory.getPlacedItems().length;
      this.hud.setHint(`E – Loot All (${stacks} stacks remaining)`);
      this.hud.show();
    } else {
      this.hud.hide();
      this.hud.setHint("");
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
    initialInventory?: SerializedInventory,
    respawnTimerOverride?: number
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
    const container: SpawnedContainer = {
      id: `world_container_${nextContainerId += 1}`,
      definition,
      inventory,
      position,
      lootTableId,
      respawnSeconds,
      respawnTimer: respawnTimerOverride ?? respawnSeconds
    };
    this.containers.push(container);
    if (initialInventory) {
      container.inventory.load(initialInventory);
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

  private lootActiveContainer(): void {
    if (!this.active) {
      return;
    }
    const stacks = [...this.active.inventory.getPlacedItems()];
    let moved = 0;
    stacks.forEach(item => {
      const copy: ItemStack = {
        ...item.stack,
        attachments: item.stack.attachments ? { ...item.stack.attachments } : undefined
      };
      const added = this.player.inventory.add({ ...copy });
      if (added) {
        this.active?.inventory.removePlacedItem(item.id);
        moved += 1;
      }
    });
    if (moved === 0) {
      this.hud.setHint("Backpack full – free space to loot");
    } else {
      this.hud.setHint(`Transferred ${moved} stacks · Press E again if space remains`);
    }
    this.syncHud();
    const poiId = this.active ? this.containerToPoi.get(this.active.id) : null;
    if (poiId) {
      this.capturePoiState(poiId);
    }
  }

  private syncHud(): void {
    if (!this.active) {
      return;
    }
    this.hud.syncFromInventory(this.active.inventory, this.active.definition.name);
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
    const stacks = this.loot.roll(container.lootTableId, { rolls: 4 });
    stacks.forEach(stack => {
      const success = container.inventory.add({ ...stack });
      if (!success) {
        // If the inventory is full, drop the remaining loot.
        console.warn(`Container ${container.id} out of space for ${stack.itemId}`);
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
        inventory: container.inventory.serialize()
      }));
    if (containers.length > 0) {
      this.poiStates.set(poiId, { poiId, containers });
    }
  }

  private syncPoiScenes(): void {
    const visiblePois = this.world.getPoisNear(this.player.position, POI_SYNC_RADIUS);
    const visibleIds = new Set(visiblePois.map((poi) => poi.id));

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
          containerState.inventory,
          containerState.respawnTimer
        );
        if (container) {
          spawnedIds.push(container.id);
        }
      });
    } else if (template) {
      template.containers.forEach(placement => {
        const position = this.offsetToWorld(poi, placement.offset);
        const container = this.spawnContainer(
          placement.container_id,
          position,
          placement.loot_table ?? poi.lootTable,
          respawnSeconds
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
        inventory: this.cloneInventory(container.inventory)
      }))
    }));
  }

  importState(states: PersistedPoiState[]): void {
    this.clearRuntimeContainers();
    this.poiStates.clear();
    states.forEach(state => {
      this.poiStates.set(state.poiId, {
        poiId: state.poiId,
        containers: state.containers.map(container => ({
          definitionId: container.definitionId,
          position: { ...container.position },
          lootTableId: container.lootTableId,
          respawnSeconds: container.respawnSeconds,
          respawnTimer: container.respawnTimer,
          inventory: this.cloneInventory(container.inventory)
        }))
      });
    });
  }

  private clearRuntimeContainers(): void {
    this.containers.splice(0, this.containers.length);
    this.poiScenes.clear();
    this.containerToPoi.clear();
    this.active = null;
    this.hud.hide();
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
}
