import type { Player } from "../entities/Player";
import type { BuildingController } from "../building/BuildingController";
import type { SurvivorController } from "../survivors/SurvivorController";
import type { ZombieDirector } from "../ai/ZombieDirector";
import { DifficultyScaler, type DifficultySnapshot } from "./DifficultyScaler";
import { BaseHeatTracker, type HeatSnapshot } from "./BaseHeatTracker";
import { SeasonManager, type SeasonSnapshot } from "./SeasonManager";

const SECONDS_PER_DAY = 600; // 10 real minutes per in-game day

export interface ProgressionSummary {
  ring: number;
  distanceKm: number;
  lootTiers: number[];
  difficultyFactor: number;
  spawnTarget: number;
  baseHeat: number;
  siegeStage: number;
  nextSiegeThreshold: number | null;
  season: string;
  seasonEffects: string[];
  seasonDaysRemaining: number;
  warnings: string[];
}

export class ProgressionController {
  private readonly difficulty = new DifficultyScaler();
  private readonly heat = new BaseHeatTracker();
  private readonly seasons = new SeasonManager();
  private readonly panel: HTMLDivElement;
  private elapsedDays = 0;
  private summary: ProgressionSummary;

  constructor(
    private readonly player: Player,
    private readonly building: BuildingController,
    private readonly survivors: SurvivorController,
    private readonly zombies: ZombieDirector
  ) {
    this.panel = document.createElement("div");
    this.panel.className = "progression-panel";
    document.body.append(this.panel);
    this.summary = this.composeSummary({
      difficulty: this.difficulty.evaluate(0, 0),
      heat: this.heat.evaluate({ lootScore: 0, defenseScore: 0, daysSurvived: 0 }),
      season: this.seasons.advance(0)
    });
    this.render();
  }

  update(deltaSeconds: number): ProgressionSummary {
    this.elapsedDays += deltaSeconds / SECONDS_PER_DAY;
    const distanceMeters = Math.hypot(this.player.position.x, this.player.position.y);
    const communityPower = this.survivors.getCommunityPowerScore();
    const difficulty = this.difficulty.evaluate(distanceMeters, communityPower);
    this.zombies.applyDifficulty(difficulty.spawnTarget, difficulty.spawnMix);

    const lootScore = this.player.inventory.getCurrentWeight() * 5; // ASSUMPTION: weight approximates loot value
    const defenseScore = this.building.getDefenseScore();
    const heat = this.heat.evaluate({ lootScore, defenseScore, daysSurvived: this.elapsedDays });
    const season = this.seasons.advance(deltaSeconds / SECONDS_PER_DAY);

    this.summary = this.composeSummary({ difficulty, heat, season });
    this.render();
    return this.summary;
  }

  getSummary(): ProgressionSummary {
    return this.summary;
  }

  private composeSummary(params: {
    difficulty: DifficultySnapshot;
    heat: HeatSnapshot;
    season: SeasonSnapshot;
  }): ProgressionSummary {
    const warnings: string[] = [];
    if (params.heat.warning) {
      warnings.push(params.heat.warning);
    }
    return {
      ring: params.difficulty.ring,
      distanceKm: params.difficulty.playerDistanceKm,
      lootTiers: params.difficulty.lootTiers,
      difficultyFactor: params.difficulty.difficultyFactor,
      spawnTarget: params.difficulty.spawnTarget,
      baseHeat: params.heat.score,
      siegeStage: params.heat.stage,
      nextSiegeThreshold: params.heat.nextThreshold,
      season: params.season.season,
      seasonEffects: params.season.effects,
      seasonDaysRemaining: params.season.daysRemaining,
      warnings
    };
  }

  private render(): void {
    const summary = this.summary;
    const effects = summary.seasonEffects.length ? summary.seasonEffects.join(", ") : "None";
    const nextSiege = summary.nextSiegeThreshold ? `${summary.nextSiegeThreshold}%` : "Max";
    this.panel.innerHTML = `
      <div class="progression-panel__row">
        <strong>Ring ${summary.ring}</strong>
        <span>${summary.distanceKm} km</span>
      </div>
      <div class="progression-panel__row">
        <span>Loot Tiers</span>
        <span>${summary.lootTiers.join(" / ")}</span>
      </div>
      <div class="progression-panel__row">
        <span>Base Heat</span>
        <span>${summary.baseHeat}% (stage ${summary.siegeStage})</span>
      </div>
      <div class="progression-panel__row">
        <span>Next Siege</span>
        <span>${nextSiege}</span>
      </div>
      <div class="progression-panel__row">
        <span>Season</span>
        <span>${summary.season} (${summary.seasonDaysRemaining}d)</span>
      </div>
      <div class="progression-panel__row progression-panel__effects">
        <span>Effects</span>
        <span>${effects}</span>
      </div>
      ${summary.warnings
        .map(warning => `<div class="progression-panel__warning" role="status">${warning}</div>`)
        .join("")}
    `;
  }
}
