import { content } from "../data";
import type { FactionDefinition } from "../data/ContentRegistry";

export interface FactionStanding {
  id: string;
  name: string;
  reputation: number;
  standing: string;
  outposts: string[];
  traderId: string | null;
}

interface FactionState {
  definition: FactionDefinition;
  reputation: number;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export class FactionManager {
  private readonly factions = new Map<string, FactionState>();

  constructor() {
    for (const def of content.factions) {
      this.factions.set(def.id, {
        definition: def,
        reputation: def.reputation_default
      });
    }
  }

  getFactions(): FactionStanding[] {
    return [...this.factions.values()].map(state => this.toStanding(state));
  }

  getFaction(id: string): FactionStanding | undefined {
    const state = this.factions.get(id);
    return state ? this.toStanding(state) : undefined;
  }

  adjustReputation(factionId: string, delta: number): FactionStanding | undefined {
    const state = this.factions.get(factionId);
    if (!state) {
      return undefined;
    }
    state.reputation = clamp(state.reputation + delta, -100, 100);
    return this.toStanding(state);
  }

  private toStanding(state: FactionState): FactionStanding {
    return {
      id: state.definition.id,
      name: state.definition.name,
      reputation: state.reputation,
      standing: FactionManager.describeStanding(state.reputation),
      outposts: state.definition.outposts,
      traderId: state.definition.trader_id
    };
  }

  static describeStanding(reputation: number): string {
    if (reputation >= 75) {
      return "Allied";
    }
    if (reputation >= 25) {
      return "Friendly";
    }
    if (reputation >= 0) {
      return "Neutral";
    }
    if (reputation >= -25) {
      return "Wary";
    }
    if (reputation >= -75) {
      return "Hostile";
    }
    return "War";
  }
}
