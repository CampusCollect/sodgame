import type { FactionManager, FactionStanding } from "./FactionManager";
import type { ConvoyAmbushResult, ConvoyView, ConvoyScheduler } from "./ConvoyScheduler";

export interface RaidPlannerSnapshot {
  factions: FactionStanding[];
  convoys: ConvoyView[];
}

export interface RaidOutcome {
  success: boolean;
  message: string;
  factionName?: string;
  loot?: string[];
  reputationChange?: number;
}

export class RaidPlanner {
  constructor(private readonly factions: FactionManager, private readonly convoys: ConvoyScheduler) {}

  getSnapshot(): RaidPlannerSnapshot {
    return {
      factions: this.factions.getFactions(),
      convoys: this.convoys.getConvoys()
    };
  }

  ambushConvoy(convoyId: string): RaidOutcome {
    const result: ConvoyAmbushResult = this.convoys.interceptConvoy(convoyId);
    if (!result.success) {
      return {
        success: false,
        message: result.message
      };
    }

    if (result.factionId && typeof result.reputationDelta === "number") {
      const standing = this.factions.adjustReputation(result.factionId, result.reputationDelta);
      return {
        success: true,
        message: result.message,
        factionName: standing?.name,
        loot: result.loot,
        reputationChange: result.reputationDelta
      };
    }

    return {
      success: true,
      message: result.message,
      loot: result.loot
    };
  }
}
