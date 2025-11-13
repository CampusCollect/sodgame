export type MoraleEventType =
  | "consumed_meal"
  | "completed_mission"
  | "rested"
  | "witnessed_death"
  | "argument"
  | "victory"
  | "injured"
  | "resource_shortage";

export interface MoraleEvent {
  type: MoraleEventType;
  intensity?: number;
  sourceId?: string;
}

export class MoraleSystem {
  constructor() {}

  tick(current: number, hoursWithoutEvent: number, traits: string[]): number {
    const decayBase = current > 50 ? 0.1 : 0.25;
    let modifier = 1;
    if (traits.includes("optimist")) {
      modifier *= 0.6;
    }
    if (traits.includes("pessimist")) {
      modifier *= 1.5;
    }
    const decay = decayBase * hoursWithoutEvent * modifier;
    return this.clamp(current - decay);
  }

  apply(current: number, event: MoraleEvent, survivorTraits: string[]): number {
    const intensity = event.intensity ?? 1;
    let delta = 0;
    switch (event.type) {
      case "consumed_meal":
        delta = 2 * intensity;
        if (survivorTraits.includes("vegetarian") && event.sourceId === "meal_meat") {
          delta = -5;
        }
        break;
      case "rested":
        delta = 3 * intensity;
        break;
      case "completed_mission":
      case "victory":
        delta = 6 * intensity;
        if (survivorTraits.includes("brave")) {
          delta += 2;
        }
        break;
      case "witnessed_death":
        delta = -15 * intensity;
        if (survivorTraits.includes("brave")) {
          delta *= 0.6;
        }
        if (survivorTraits.includes("cowardly")) {
          delta *= 1.4;
        }
        break;
      case "argument":
        delta = -5 * intensity;
        break;
      case "injured":
        delta = -8 * intensity;
        if (survivorTraits.includes("injury_prone")) {
          delta *= 1.2;
        }
        break;
      case "resource_shortage":
        delta = -4 * intensity;
        if (survivorTraits.includes("pessimist")) {
          delta *= 1.5;
        }
        break;
      default:
        delta = 0;
    }

    if (survivorTraits.includes("optimist") && delta > 0) {
      delta *= 1.2;
    }

    return this.clamp(current + delta);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, Number(value.toFixed(2))));
  }
}
