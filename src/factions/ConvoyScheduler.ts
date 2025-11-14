import { content } from "../data";
import type { ConvoyDefinition } from "../data/ContentRegistry";
import type { FactionManager } from "./FactionManager";

const HOURS_PER_SECOND = 1 / 60; // 1 in-game hour per real-time minute

export type ConvoyState = "scheduled" | "intel" | "enroute" | "cooldown";

interface ConvoyRuntime {
  definition: ConvoyDefinition;
  state: ConvoyState;
  nextDepartureHours: number;
  intelRevealed: boolean;
  enrouteHours: number;
  cooldownHours: number;
}

export interface ConvoyView {
  id: string;
  factionId: string;
  factionName: string;
  route: string[];
  cargo: string[];
  guards: number;
  escortVehicles: number;
  etaHours: number;
  state: ConvoyState;
  intelRevealed: boolean;
  canAmbush: boolean;
  blockedReason?: string;
}

export interface ConvoyAmbushResult {
  success: boolean;
  message: string;
  factionId?: string;
  loot?: string[];
  reputationDelta?: number;
}

export class ConvoyScheduler {
  private readonly convoys = new Map<string, ConvoyRuntime>();

  constructor(private readonly factions: FactionManager) {
    for (const def of content.convoys) {
      this.convoys.set(def.id, {
        definition: def,
        state: "scheduled",
        nextDepartureHours: def.interval_hours,
        intelRevealed: false,
        enrouteHours: 0,
        cooldownHours: 0
      });
    }
  }

  update(deltaSeconds: number): void {
    const hours = deltaSeconds * HOURS_PER_SECOND;
    if (hours <= 0) {
      return;
    }

    this.convoys.forEach(runtime => this.advance(runtime, hours));
  }

  getConvoys(): ConvoyView[] {
    return [...this.convoys.values()].map(runtime => {
      const faction = this.factions.getFaction(runtime.definition.faction);
      return {
        id: runtime.definition.id,
        factionId: runtime.definition.faction,
        factionName: faction?.name ?? runtime.definition.faction,
        route: runtime.definition.route,
        cargo: runtime.definition.cargo,
        guards: runtime.definition.guards,
        escortVehicles: runtime.definition.escort_vehicles,
        etaHours: this.getEta(runtime),
        state: runtime.state,
        intelRevealed: runtime.intelRevealed,
        canAmbush: runtime.intelRevealed && runtime.state !== "cooldown" && runtime.state !== "enroute",
        blockedReason: this.getBlockedReason(runtime)
      };
    });
  }

  getConvoy(id: string): ConvoyView | undefined {
    const runtime = this.convoys.get(id);
    if (!runtime) {
      return undefined;
    }
    const faction = this.factions.getFaction(runtime.definition.faction);
    return {
      id: runtime.definition.id,
      factionId: runtime.definition.faction,
      factionName: faction?.name ?? runtime.definition.faction,
      route: runtime.definition.route,
      cargo: runtime.definition.cargo,
      guards: runtime.definition.guards,
      escortVehicles: runtime.definition.escort_vehicles,
      etaHours: this.getEta(runtime),
      state: runtime.state,
      intelRevealed: runtime.intelRevealed,
      canAmbush: runtime.intelRevealed && runtime.state !== "cooldown" && runtime.state !== "enroute",
      blockedReason: this.getBlockedReason(runtime)
    };
  }

  interceptConvoy(convoyId: string): ConvoyAmbushResult {
    const runtime = this.convoys.get(convoyId);
    if (!runtime) {
      return { success: false, message: "Unknown convoy" };
    }
    if (!runtime.intelRevealed || runtime.state === "enroute") {
      return { success: false, message: "Need active intel window before the convoy departs" };
    }
    if (runtime.state === "cooldown") {
      return { success: false, message: "Convoy already hit – waiting for next dispatch" };
    }

    runtime.state = "cooldown";
    runtime.cooldownHours = 2;
    runtime.intelRevealed = false;
    runtime.nextDepartureHours = runtime.definition.interval_hours;

    return {
      success: true,
      message: "Convoy ambushed successfully. Escorts scattered.",
      factionId: runtime.definition.faction,
      loot: runtime.definition.cargo,
      reputationDelta: -20
    };
  }

  private advance(runtime: ConvoyRuntime, hours: number): void {
    switch (runtime.state) {
      case "enroute": {
        runtime.enrouteHours -= hours;
        if (runtime.enrouteHours <= 0) {
          runtime.state = "scheduled";
          runtime.nextDepartureHours = runtime.definition.interval_hours;
        }
        return;
      }
      case "cooldown": {
        runtime.cooldownHours -= hours;
        if (runtime.cooldownHours <= 0) {
          runtime.state = "scheduled";
          runtime.nextDepartureHours = runtime.definition.interval_hours;
        }
        return;
      }
      default:
        break;
    }

    runtime.nextDepartureHours -= hours;
    if (runtime.state === "scheduled" && runtime.nextDepartureHours <= 1) {
      runtime.state = "intel";
      runtime.intelRevealed = true;
    }

    if (runtime.nextDepartureHours <= 0) {
      runtime.state = "enroute";
      runtime.enrouteHours = 1;
      runtime.intelRevealed = false;
      runtime.nextDepartureHours = runtime.definition.interval_hours;
    }
  }

  private getEta(runtime: ConvoyRuntime): number {
    switch (runtime.state) {
      case "enroute":
        return runtime.enrouteHours;
      case "cooldown":
        return runtime.cooldownHours;
      default:
        return Math.max(0, runtime.nextDepartureHours);
    }
  }

  private getBlockedReason(runtime: ConvoyRuntime): string | undefined {
    if (runtime.state === "enroute") {
      return "Already left the depot";
    }
    if (runtime.state === "cooldown") {
      return "Cooling down after ambush";
    }
    if (!runtime.intelRevealed) {
      return "Intel not intercepted";
    }
    return undefined;
  }
}
