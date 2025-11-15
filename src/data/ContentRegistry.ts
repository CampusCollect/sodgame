import itemsData from "../../data/items.json";
import containersData from "../../data/containers.json";
import recipesData from "../../data/recipes.json";
import blueprintsData from "../../data/blueprints.json";
import vehiclesData from "../../data/vehicles.json";
import trailersData from "../../data/trailers.json";
import zombieTypesData from "../../data/zombie_types.json";
import noiseClassesData from "../../data/noise_classes.json";
import lootTablesData from "../../data/loot_tables.json";
import tradersData from "../../data/traders.json";
import factionsData from "../../data/factions.json";
import convoysData from "../../data/convoys.json";
import structuresData from "../../data/structures.json";
import facilitiesData from "../../data/facilities.json";
import upgradesData from "../../data/upgrades.json";
import progressionData from "../../data/progression_curve.json";
import skillsData from "../../data/skills.json";
import traitsData from "../../data/traits.json";
import survivorsData from "../../data/survivors.json";
import stealthToolsData from "../../data/stealth_tools.json";
import biomesData from "../../data/biomes.json";
import poiData from "../../data/poi_spawns.json";
import poiTemplatesData from "../../data/poi_templates.json";

export interface WeaponDefinition {
  category: "melee" | "firearm";
  damage: number;
  range: number;
  attack_cooldown_s: number;
  swing_arc_deg?: number;
  swing_time_s?: number;
  stamina_cost?: number;
  magazine_size?: number;
  ammo_type?: string;
  reload_seconds?: number;
  projectile_speed?: number;
  projectile_spread_deg?: number;
  projectile_count?: number;
  fire_mode?: "semi" | "auto" | "burst";
  noise_class?: string;
}

export interface GrenadeDefinition {
  damage: number;
  radius: number;
  fuse_seconds: number;
  throw_speed: number;
  noise_class: string;
  status_effect?: string;
}

export interface ItemDefinition {
  id: string;
  name: string;
  size: [number, number];
  weight_kg: number;
  stack_max: number;
  durability_max: number;
  tags: string[];
  actions: string[];
  description: string;
  attachments?: string[];
  attachment_slot?: string;
  freshness_hours?: number;
  weapon?: WeaponDefinition;
  grenade?: GrenadeDefinition;
  disassembly_yield?: { item: string; qty: number }[];
}

export interface BiomeDefinition {
  id: string;
  name: string;
  palette: string[];
  ideal_radius: number;
  falloff: number;
  weight: number;
  zombie_density: number;
  loot_tier_weights: Record<string, number>;
  ambient: string;
  poi_weights: Record<string, number>;
}

export interface PoiTypeDefinition {
  id: string;
  name: string;
  category: string;
  biomes: string[];
  size: [number, number];
  loot_table: string;
  spawn_chance: number;
  min_per_chunk: number;
  max_per_chunk: number;
  alarm: "silent" | "active";
  respawn_days: [number, number];
  is_major?: boolean;
  zombie_density: number;
}

export interface PoiTemplateContainerPlacement {
  id: string;
  container_id: string;
  offset: [number, number];
  loot_table?: string;
  locked?: boolean;
}

export interface PoiTemplateDefinition {
  id: string;
  applies_to: string[];
  label: string;
  containers: PoiTemplateContainerPlacement[];
}

export interface ContainerDefinition {
  id: string;
  name: string;
  grid: [number, number];
  weight_limit_kg: number;
  nested_allowed: boolean;
  type: string;
  search_seconds?: number;
  locked?: boolean;
  lock_difficulty?: number;
}

export interface RecipeDefinition {
  id: string;
  name: string;
  station: string;
  skill_req: Record<string, number>;
  time_seconds: number;
  inputs: { item: string; qty: number }[];
  output: { item: string; qty: number; condition: number };
  blueprint_required?: string;
}

export interface BlueprintDefinition {
  id: string;
  name: string;
  unlocks: string[];
  rarity: string;
  sources: string[];
}

export interface VehicleDefinition {
  id: string;
  name: string;
  seats: number;
  cargo_kg: number;
  fuel_l: number;
  speed_ms: number;
  noise_idle: number;
  noise_drive: number;
  hp_max: number;
  requires_trailer: boolean;
  compatible_trailers: string[];
  container?: string;
}

export interface TrailerDefinition {
  id: string;
  name: string;
  grid: [number, number];
  weight_limit_kg: number;
  enclosed: boolean;
  lockable: boolean;
  can_store_vehicles: boolean;
  vehicle_slots?: { size: [number, number]; max_weight_kg: number }[];
  fuel_capacity_l?: number;
}

export interface ZombieTypeDefinition {
  id: string;
  speed_ms: number;
  hp: number;
  damage: number;
  sight_range_m: number;
  hearing_multiplier: number;
  spawn_weight: number;
  abilities: string[];
}

export interface NoiseClassDefinition {
  id: string;
  range_m: number;
  intensity: number;
  duration_s: number;
}

export interface StealthToolDefinition {
  id: string;
  name: string;
  description: string;
  noise_class: string;
  range_m: number;
  cooldown_s: number;
  duration_override_s?: number;
}

export interface LootItemRoll {
  id: string;
  weight: number;
  qty_range?: [number, number];
  condition_range?: [number, number];
}

export interface LootTableDefinition {
  id: string;
  tier: number;
  items: LootItemRoll[];
}

export interface TraderDefinition {
  id: string;
  faction: string;
  stock_categories: string[];
  reputation_min: number;
  restock_hours: number;
}

export interface FactionDefinition {
  id: string;
  name: string;
  reputation_default: number;
  outposts: string[];
  convoy_frequency_hours: number;
  trader_id: string | null;
}

export interface ConvoyDefinition {
  id: string;
  faction: string;
  route: string[];
  cargo: string[];
  guards: number;
  escort_vehicles: number;
  interval_hours: number;
}

export interface StructureDefinition {
  id: string;
  name: string;
  size: [number, number];
  cost: Record<string, number>;
  build_time_seconds: number;
  tier: number;
  hp?: number;
  power_required_kw?: number;
  power_output_kw?: number;
}

export interface FacilityProductionDefinition {
  resource: string;
  amount: number;
}

export interface FacilityTierDefinition {
  tier: number;
  slots: number;
  power_kw: number;
  jobs: string[];
  build_cost: Record<string, number>;
  build_time_seconds: number;
  requires_blueprint?: string;
  production_per_hour?: FacilityProductionDefinition[];
}

export interface FacilityDefinition {
  id: string;
  name: string;
  tiers: FacilityTierDefinition[];
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  applies_to: string;
  effects: Record<string, number>;
  cost: Record<string, number>;
  build_time_seconds: number;
}

export interface ProgressionRingDefinition {
  ring: number;
  radius_km: number;
  loot_tiers: number[];
  zombie_weights: Record<string, number>;
}

export interface BaseHeatDefinition {
  loot_value_weight: number;
  defense_weight: number;
  days_survived_weight: number;
  siege_thresholds: number[];
}

export interface SeasonalEventDefinition {
  season: string;
  effects: string[];
  duration_days: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
}

export interface TraitDefinition {
  id: string;
  name: string;
  category: "positive" | "negative" | "neutral";
  description: string;
}

export interface SurvivorTemplate {
  id: string;
  name: string;
  skills: Record<string, number>;
  traits: string[];
  background: string;
}

export interface SurvivorJobDefinition {
  id: string;
  name: string;
  description: string;
  skill?: string;
}

export interface SurvivorContentDefinition {
  starting_roster: SurvivorTemplate[];
  job_catalog: SurvivorJobDefinition[];
}

export interface ProgressionDefinition {
  rings: ProgressionRingDefinition[];
  base_heat: BaseHeatDefinition;
  seasonal_events: SeasonalEventDefinition[];
}

export interface ContentSnapshot {
  items: ItemDefinition[];
  containers: ContainerDefinition[];
  recipes: RecipeDefinition[];
  blueprints: BlueprintDefinition[];
  vehicles: VehicleDefinition[];
  trailers: TrailerDefinition[];
  zombie_types: ZombieTypeDefinition[];
  noise_classes: NoiseClassDefinition[];
  stealth_tools: StealthToolDefinition[];
  loot_tables: LootTableDefinition[];
  traders: TraderDefinition[];
  barter_values: Record<string, number>;
  factions: FactionDefinition[];
  convoys: ConvoyDefinition[];
  structures: StructureDefinition[];
  facilities: FacilityDefinition[];
  upgrades: UpgradeDefinition[];
  progression: ProgressionDefinition;
  skills: SkillDefinition[];
  traits: TraitDefinition[];
  survivors: SurvivorContentDefinition;
  biomes: BiomeDefinition[];
  poi_types: PoiTypeDefinition[];
  poi_templates: PoiTemplateDefinition[];
}

export class ContentRegistry {
  static load(): ContentSnapshot {
    return {
      items: itemsData.items,
      containers: containersData.containers,
      recipes: recipesData.recipes,
      blueprints: blueprintsData.blueprints,
      vehicles: vehiclesData.vehicles,
      trailers: trailersData.trailers,
      zombie_types: zombieTypesData.zombie_types,
      noise_classes: noiseClassesData.noise_classes,
      stealth_tools: stealthToolsData.stealth_tools,
      loot_tables: lootTablesData.loot_tables,
      traders: tradersData.traders,
      barter_values: tradersData.barter_values,
      factions: factionsData.factions,
      convoys: convoysData.convoys,
      structures: structuresData.structures,
      facilities: facilitiesData.facilities,
      upgrades: upgradesData.upgrades,
      progression: progressionData,
      skills: skillsData.skills,
      traits: traitsData.traits,
      survivors: survivorsData,
      biomes: biomesData.biomes,
      poi_types: poiData.poi_types,
      poi_templates: poiTemplatesData.templates
    };
  }
}
