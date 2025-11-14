import type { FactionManager, FactionStanding } from "./FactionManager";
import type { ConvoyAmbushResult, ConvoyView, ConvoyScheduler } from "./ConvoyScheduler";

export interface RaidPlannerSnapshot {
  factions: FactionStanding[];
  convoys: ConvoyView[];
  trackedConvoyId: string | null;
}

export interface RaidOutcome {
  success: boolean;
  message: string;
  factionName?: string;
  loot?: string[];
  reputationChange?: number;
}

export class RaidPlanner {
  private trackedConvoyId: string | null = null;

  constructor(private readonly factions: FactionManager, private readonly convoys: ConvoyScheduler) {}

  getSnapshot(): RaidPlannerSnapshot {
    return {
      factions: this.factions.getFactions(),
      convoys: this.convoys.getConvoys(),
      trackedConvoyId: this.trackedConvoyId
    };
  }

  trackConvoy(convoyId: string | null): { success: boolean; message: string } {
    if (convoyId === null) {
      this.trackedConvoyId = null;
      return { success: true, message: "Stopped tracking convoy" };
    }
    const convoy = this.convoys.getConvoy(convoyId);
    if (!convoy) {
      return { success: false, message: "Unknown convoy" };
    }
    this.trackedConvoyId = convoyId;
    return {
      success: true,
      message: convoy.intelRevealed ? `Tracking ${convoy.factionName} convoy` : "Tracking set – intel pending"
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

    const outcome: RaidOutcome = {
      success: true,
      message: result.message,
      loot: result.loot
    };
    if (this.trackedConvoyId === convoyId) {
      this.trackedConvoyId = null;
    }
    return outcome;
  }
}
