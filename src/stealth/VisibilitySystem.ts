export type Stance = "crouch" | "walk" | "sprint";

interface VisibilityContext {
  stance: Stance;
  movementIntensity: number;
  ambientLight: number;
  noiseLevel: number;
}

export class VisibilitySystem {
  compute(context: VisibilityContext): number {
    const base = 25 + context.ambientLight * 60;
    const movementPenalty = context.movementIntensity * 30;
    const noisePenalty = context.noiseLevel * 0.2;
    const stanceBonus = this.getStanceModifier(context.stance);
    const score = base + movementPenalty + noisePenalty + stanceBonus;
    return Math.max(0, Math.min(100, score));
  }

  private getStanceModifier(stance: Stance): number {
    switch (stance) {
      case "crouch":
        return -20;
      case "sprint":
        return 20;
      default:
        return 0;
    }
  }
}
