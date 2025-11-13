import type { SkillDefinition } from "../data/ContentRegistry";

export interface SkillState {
  level: number;
  xp: number;
}

const LEVEL_THRESHOLDS = [0, 50, 125, 250, 400, 600, 850, 1150, 1500, 1900, 2350];

export class SkillProgression {
  private readonly skills = new Map<string, SkillDefinition>();

  constructor(definitions: SkillDefinition[]) {
    definitions.forEach(skill => this.skills.set(skill.id, skill));
  }

  gain(skillStates: Record<string, SkillState>, skillId: string, amount: number): void {
    if (!this.skills.has(skillId)) {
      return;
    }
    const current = skillStates[skillId] ?? { level: 0, xp: 0 };
    let xp = current.xp + amount;
    let level = current.level;

    while (level < LEVEL_THRESHOLDS.length - 1 && xp >= LEVEL_THRESHOLDS[level + 1]) {
      level += 1;
    }

    skillStates[skillId] = { level, xp };
  }

  ensure(skillStates: Record<string, SkillState>): Record<string, SkillState> {
    const result: Record<string, SkillState> = {};
    this.skills.forEach((_skill, id) => {
      result[id] = skillStates[id] ?? { level: 0, xp: 0 };
    });
    return result;
  }
}
