import type { InputManager } from "../engine/Input";
import type { Player } from "../entities/Player";
import type { WorldContainerManager } from "../loot/WorldContainerManager";
import { FactionManager } from "./FactionManager";
import { ConvoyScheduler } from "./ConvoyScheduler";
import { RaidPlanner } from "./RaidPlanner";
import { RaidPlanningUI } from "../ui/RaidPlanningUI";
import { createStack, resolveItemDefinition, type ItemStack } from "../inventory/Item";

export class FactionController {
  private readonly factions = new FactionManager();
  private readonly convoys = new ConvoyScheduler(this.factions);
  private readonly planner = new RaidPlanner(this.factions, this.convoys);
  private readonly panel: RaidPlanningUI;
  private syncCooldown = 0;

  constructor(private readonly input: InputManager, private readonly player: Player, private readonly containers: WorldContainerManager) {
    this.panel = new RaidPlanningUI({
      onAmbush: convoyId => this.handleAmbush(convoyId),
      onTrack: convoyId => this.handleTrack(convoyId)
    });

    this.input.on("toggle-raids", () => this.toggle());
  }

  update(deltaSeconds: number): void {
    this.convoys.update(deltaSeconds);
    this.syncCooldown -= deltaSeconds;
    if (this.panel.isOpen() && this.syncCooldown <= 0) {
      this.syncPanel();
      this.syncCooldown = 0.5;
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

  private syncPanel(): void {
    this.panel.setData(this.planner.getSnapshot());
  }

  private handleTrack(convoyId: string | null): void {
    const result = this.planner.trackConvoy(convoyId);
    this.panel.setStatus(result.message, !result.success);
    if (result.success) {
      this.syncPanel();
    }
  }

  private handleAmbush(convoyId: string): void {
    const result = this.planner.ambushConvoy(convoyId);
    this.panel.setStatus(result.message, !result.success);
    if (result.success) {
      const loot = result.loot?.join(", ") ?? "Mixed loot";
      const faction = result.factionName ?? "Target";
      const rep = typeof result.reputationChange === "number" ? ` (${result.reputationChange} rep)` : "";
      this.panel.pushLog(`Ambushed ${faction}: ${loot}${rep}`);
      if (result.loot?.length) {
        const leftovers = this.grantLoot(result.loot);
        if (leftovers.length > 0) {
          this.containers.spawnRewardCache(leftovers, "Convoy Loot");
        }
      }
      this.syncPanel();
    }
  }

  private grantLoot(itemIds: string[]): ItemStack[] {
    const leftovers: ItemStack[] = [];
    itemIds.forEach(itemId => {
      const definition = resolveItemDefinition(itemId);
      const quantity = definition.stack_max > 1 ? Math.max(1, Math.round(definition.stack_max / 2)) : 1;
      const stack = createStack(itemId, quantity);
      const result = this.player.inventory.add({ ...stack });
      if (result.remainder > 0) {
        leftovers.push({ ...stack, quantity: result.remainder });
      }
    });
    if (itemIds.length > 0) {
      this.panel.pushLog(`Loot delivered to backpack (+${itemIds.length} stacks)`);
    }
    return leftovers;
  }
}
