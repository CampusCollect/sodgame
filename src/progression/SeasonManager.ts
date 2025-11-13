import { content } from "../data";
import type { SeasonalEventDefinition } from "../data/ContentRegistry";

export interface SeasonSnapshot extends SeasonalEventDefinition {
  daysRemaining: number;
}

const DEFAULT_SEASON: SeasonalEventDefinition = {
  season: "evergreen",
  effects: [],
  duration_days: 30
};

export class SeasonManager {
  private readonly events: SeasonalEventDefinition[];
  private index = 0;
  private daysRemaining: number;

  constructor() {
    this.events = content.progression.seasonal_events.length ? content.progression.seasonal_events : [DEFAULT_SEASON];
    this.daysRemaining = this.events[0]?.duration_days ?? DEFAULT_SEASON.duration_days;
  }

  advance(deltaDays: number): SeasonSnapshot {
    if (!this.events.length) {
      return { ...DEFAULT_SEASON, daysRemaining: DEFAULT_SEASON.duration_days };
    }
    this.daysRemaining -= deltaDays;
    while (this.daysRemaining <= 0) {
      this.index = (this.index + 1) % this.events.length;
      this.daysRemaining += this.events[this.index].duration_days;
    }
    return {
      ...this.events[this.index],
      daysRemaining: Number(this.daysRemaining.toFixed(1))
    };
  }
}
