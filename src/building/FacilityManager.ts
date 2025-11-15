import { content } from "../data";
import type { FacilityDefinition, FacilityTierDefinition } from "../data/ContentRegistry";
import type { Inventory } from "../inventory/Inventory";
import type { BuildingManager } from "./BuildingManager";
import { BaseStockpile, type StockpileResource, type StockpileSnapshot } from "./BaseStockpile";
import type { JobStatMap, JobStats } from "../types/JobStats";

export interface FacilityInstanceState {
  id: string;
  definition: FacilityDefinition;
  tierIndex: number;
  status: "building" | "active";
  remainingBuildSeconds: number;
  powered: boolean;
  efficiency: number;
  lastOutput: { resource: string; amount: number }[];
}

export interface FacilityView extends FacilityInstanceState {
  tier: FacilityTierDefinition;
}

export interface FacilityPersistenceState {
  facilities: {
    definitionId: string;
    tierIndex: number;
    status: "building" | "active";
    remainingBuildSeconds: number;
  }[];
  stockpile: StockpileSnapshot;
}

const SECONDS_PER_HOUR = 3600;

export class FacilityManager {
  private readonly definitions = new Map<string, FacilityDefinition>();
  private readonly instances: FacilityInstanceState[] = [];
  private readonly stockpile = new BaseStockpile();
  private nextId = 1;

  constructor(private readonly buildingManager: BuildingManager, private readonly inventory: Inventory) {
    content.facilities.forEach(def => this.definitions.set(def.id, def));
  }

  getDefinitions(): FacilityDefinition[] {
    return [...this.definitions.values()];
  }

  getFacilities(): FacilityView[] {
    return this.instances.map(instance => ({ ...instance, tier: this.getTier(instance) }));
  }

  getStockpileSnapshot(): StockpileSnapshot {
    return this.stockpile.getTotals();
  }

  getStockpileValue(): number {
    return this.stockpile.getValueScore();
  }

  beginConstruction(facilityId: string): { success: boolean; error?: string } {
    if (this.instances.some(instance => instance.definition.id === facilityId)) {
      return { success: false, error: "Facility already built" };
    }
    const definition = this.definitions.get(facilityId);
    if (!definition) {
      return { success: false, error: "Unknown facility" };
    }
    const tier = definition.tiers[0];
    if (!this.canAfford(tier)) {
      return { success: false, error: "Missing materials" };
    }
    if (!this.consumeCost(tier)) {
      return { success: false, error: "Failed to consume materials" };
    }
    this.instances.push({
      id: `facility_${this.nextId++}`,
      definition,
      tierIndex: 0,
      status: "building",
      remainingBuildSeconds: tier.build_time_seconds,
      powered: false,
      efficiency: 0,
      lastOutput: []
    });
    return { success: true };
  }

  upgradeFacility(instanceId: string): { success: boolean; error?: string } {
    const instance = this.instances.find(facility => facility.id === instanceId);
    if (!instance) {
      return { success: false, error: "Unknown facility" };
    }
    if (instance.status === "building") {
      return { success: false, error: "Already upgrading" };
    }
    const definition = instance.definition;
    const nextTierIndex = instance.tierIndex + 1;
    const nextTier = definition.tiers[nextTierIndex];
    if (!nextTier) {
      return { success: false, error: "Max tier reached" };
    }
    if (!this.canAfford(nextTier)) {
      return { success: false, error: "Missing materials" };
    }
    if (!this.consumeCost(nextTier)) {
      return { success: false, error: "Failed to consume materials" };
    }
    instance.tierIndex = nextTierIndex;
    instance.status = "building";
    instance.remainingBuildSeconds = nextTier.build_time_seconds;
    instance.powered = false;
    instance.efficiency = 0;
    instance.lastOutput = [];
    return { success: true };
  }

  update(deltaSeconds: number, jobStats: JobStatMap): void {
    if (!this.instances.length) {
      this.buildingManager.setFacilityLoad(0);
      return;
    }
    const builderStats = jobStats.builder;
    const buildRate = 1 + (builderStats?.count ?? 0) * 0.1 + (builderStats?.avgSkill ?? 0) * 0.05;
    const buildSeconds = deltaSeconds * buildRate;

    this.instances.forEach(instance => {
      if (instance.status === "building") {
        instance.remainingBuildSeconds = Math.max(0, instance.remainingBuildSeconds - buildSeconds);
        if (instance.remainingBuildSeconds === 0) {
          instance.status = "active";
        }
        instance.powered = false;
        instance.efficiency = 0;
        instance.lastOutput = [];
      }
    });

    const { generatorKw, structureKw } = this.buildingManager.getPowerBreakdown();
    const availableForFacilities = Math.max(0, generatorKw - structureKw);
    let remainingPower = availableForFacilities;

    this.instances.forEach(instance => {
      if (instance.status !== "active") {
        instance.powered = false;
        return;
      }
      const tier = this.getTier(instance);
      const demand = tier.power_kw ?? 0;
      if (demand <= 0) {
        instance.powered = true;
        return;
      }
      if (remainingPower >= demand) {
        instance.powered = true;
        remainingPower -= demand;
      } else {
        instance.powered = false;
      }
    });

    const actualConsumption = availableForFacilities - remainingPower;
    this.buildingManager.setFacilityLoad(actualConsumption);

    const hours = deltaSeconds / SECONDS_PER_HOUR;
    this.instances.forEach(instance => {
      if (instance.status !== "active" || !instance.powered) {
        if (instance.status === "active") {
          instance.lastOutput = [];
        }
        instance.efficiency = 0;
        return;
      }
      const tier = this.getTier(instance);
      const staffing = this.computeStaffing(tier, jobStats);
      const staffingRatio = tier.slots > 0 ? Math.min(1, staffing.count / tier.slots) : 1;
      const skillBonus = 1 + staffing.avgSkill * 0.05;
      const efficiency = Number((staffingRatio * skillBonus).toFixed(2));
      instance.efficiency = efficiency;
      instance.lastOutput = [];
      tier.production_per_hour?.forEach(rule => {
        const produced = rule.amount * efficiency * hours;
        if (produced <= 0) {
          return;
        }
        const amount = Number(produced.toFixed(2));
        this.stockpile.add(rule.resource as StockpileResource, amount);
        instance.lastOutput.push({ resource: rule.resource, amount });
      });
    });
  }

  serialize(): FacilityPersistenceState {
    return {
      facilities: this.instances.map(instance => ({
        definitionId: instance.definition.id,
        tierIndex: instance.tierIndex,
        status: instance.status,
        remainingBuildSeconds: instance.remainingBuildSeconds
      })),
      stockpile: this.stockpile.serialize()
    };
  }

  load(state?: FacilityPersistenceState): void {
    this.instances.length = 0;
    this.nextId = 1;
    if (state?.facilities?.length) {
      state.facilities.forEach(saved => {
        const definition = this.definitions.get(saved.definitionId);
        if (!definition) {
          console.warn(`Unknown facility ${saved.definitionId} in save data`);
          return;
        }
        const tier = definition.tiers[saved.tierIndex];
        if (!tier) {
          console.warn(`Invalid tier ${saved.tierIndex} for facility ${saved.definitionId}`);
          return;
        }
        this.instances.push({
          id: `facility_${this.nextId++}`,
          definition,
          tierIndex: saved.tierIndex,
          status: saved.status,
          remainingBuildSeconds: saved.remainingBuildSeconds,
          powered: false,
          efficiency: 0,
          lastOutput: []
        });
      });
    }
    this.stockpile.load(state?.stockpile);
    this.buildingManager.setFacilityLoad(0);
  }

  private getTier(instance: FacilityInstanceState): FacilityTierDefinition {
    const tier = instance.definition.tiers[instance.tierIndex];
    if (!tier) {
      throw new Error(`Missing tier index ${instance.tierIndex} for ${instance.definition.id}`);
    }
    return tier;
  }

  private canAfford(tier: FacilityTierDefinition): boolean {
    return Object.entries(tier.build_cost).every(([itemId, qty]) => this.inventory.getQuantity(itemId) >= qty);
  }

  private consumeCost(tier: FacilityTierDefinition): boolean {
    const requirements = Object.entries(tier.build_cost).map(([itemId, quantity]) => ({ itemId, quantity }));
    return this.inventory.consumeItems(requirements);
  }

  private computeStaffing(tier: FacilityTierDefinition, jobStats: JobStatMap): JobStats {
    let totalCount = 0;
    let totalSkill = 0;
    tier.jobs.forEach(jobId => {
      const stats = jobStats[jobId];
      if (stats) {
        totalCount += stats.count;
        totalSkill += stats.avgSkill * stats.count;
      }
    });
    const avgSkill = totalCount > 0 ? totalSkill / totalCount : 0;
    return { count: totalCount, avgSkill };
  }
}
