import type { Player, Vector2 } from "../entities/Player";
import type { InputManager } from "../engine/Input";
import { content } from "../data";
import type { ContainerDefinition } from "../data/ContentRegistry";
import { Inventory } from "../inventory/Inventory";
import type { ItemStack } from "../inventory/Item";
import { TransparentContainerHUD } from "../ui/TransparentContainerHUD";
import { LootGenerator } from "./LootGenerator";

interface SpawnedContainer {
  id: string;
  definition: ContainerDefinition;
  inventory: Inventory;
  position: Vector2;
  lootTableId: string;
  respawnSeconds: number;
  respawnTimer: number;
}

const INTERACTION_RANGE = 140;
const RESPAWN_SECONDS = 90;

let nextContainerId = 0;

export class WorldContainerManager {
  private readonly containers: SpawnedContainer[] = [];
  private readonly hud = new TransparentContainerHUD("Container");
  private readonly loot = new LootGenerator();
  private active: SpawnedContainer | null = null;

  constructor(
    private readonly player: Player,
    private readonly input: InputManager,
    private readonly viewport: { width: number; height: number }
  ) {
    this.hud.setActions([
      {
        label: "Loot All",
        title: "Transfer every stack into the backpack (E)",
        onClick: () => this.lootActiveContainer()
      }
    ]);
    this.spawnDemoContainers();
    this.input.on("interact", () => this.lootActiveContainer());
  }

  update(deltaTime: number): void {
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

  private spawnDemoContainers(): void {
    this.spawnContainer("container_world_crate_large", { x: 120, y: -60 }, "loot_residential_t1");
    this.spawnContainer("container_world_crate_large", { x: -220, y: 140 }, "loot_industrial_t3");
    this.spawnContainer("container_world_crate_large", { x: 280, y: 120 }, "loot_military_t4");
  }

  private spawnContainer(definitionId: string, position: Vector2, lootTableId: string): void {
    const definition = content.containers.find(container => container.id === definitionId);
    if (!definition) {
      throw new Error(`Container definition ${definitionId} missing`);
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
      respawnSeconds: RESPAWN_SECONDS,
      respawnTimer: RESPAWN_SECONDS
    };
    this.containers.push(container);
    this.refill(container);
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
  }
}
