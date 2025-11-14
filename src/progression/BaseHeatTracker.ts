import { content } from "../data";

export interface HeatSnapshot {
  score: number;
  stage: number;
  thresholds: number[];
  nextThreshold: number | null;
  warning: string | null;
  lootScore: number;
  defenseScore: number;
  daysSurvived: number;
}

interface HeatInputs {
  lootScore: number;
  defenseScore: number;
  daysSurvived: number;
}

export class BaseHeatTracker {
  private readonly config = content.progression.base_heat;
  private lastStage = 0;

  evaluate(inputs: HeatInputs): HeatSnapshot {
    const lootWeighted = inputs.lootScore * this.config.loot_value_weight;
    const defenseWeighted = inputs.defenseScore * this.config.defense_weight;
    const daysWeighted = inputs.daysSurvived * this.config.days_survived_weight;
    const rawScore = lootWeighted + defenseWeighted + daysWeighted;
    const normalized = Math.min(100, Math.round(rawScore));
    const thresholds = this.config.siege_thresholds;
    const stage = thresholds.filter(value => normalized >= value).length;
    const nextThreshold = thresholds.find(value => value > normalized) ?? null;
    const warning = stage > this.lastStage ? `Siege threat increased to level ${stage}` : null;
    this.lastStage = stage;
    return {
      score: normalized,
      stage,
      thresholds,
      nextThreshold,
      warning,
      lootScore: Number(inputs.lootScore.toFixed(1)),
      defenseScore: Number(inputs.defenseScore.toFixed(1)),
      daysSurvived: Number(inputs.daysSurvived.toFixed(1))
    };
  }
}
