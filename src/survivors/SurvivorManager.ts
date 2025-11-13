import { content } from "../data";
import type { SurvivorJobDefinition } from "../data/ContentRegistry";
import { MoraleSystem, type MoraleEvent } from "./MoraleSystem";
import { RelationshipGraph } from "./RelationshipGraph";
import { SkillProgression, type SkillState } from "./SkillProgression";

export interface Survivor {
  id: string;
  name: string;
  background: string;
  traits: string[];
  morale: number;
  hunger: number;
  stamina: number;
  health: number;
  skills: Record<string, SkillState>;
  injuries: string[];
  job: string | null;
  hoursSinceMoraleEvent: number;
  status: "active" | "injured" | "resting" | "dead";
}

export interface SurvivorSummary extends Survivor {
  relationships: { id: string; value: number }[];
}

export interface RecruitOptions {
  name: string;
  background: string;
  traits: string[];
  skills: Record<string, number>;
}

const DEFAULT_STAT = 100;

export class SurvivorManager {
  private readonly survivors = new Map<string, Survivor>();
  private readonly morale: MoraleSystem;
  private readonly relationships = new RelationshipGraph();
  private readonly skillProgression: SkillProgression;
  private readonly jobs = new Map<string, SurvivorJobDefinition>();

  constructor() {
    this.morale = new MoraleSystem();
    this.skillProgression = new SkillProgression(content.skills);
    content.survivors.job_catalog.forEach(job => this.jobs.set(job.id, job));
    this.seedStartingRoster();
  }

  update(deltaHours: number): void {
    this.survivors.forEach(survivor => {
      if (survivor.status === "dead") {
        return;
      }
      survivor.hoursSinceMoraleEvent += deltaHours;
      survivor.morale = this.morale.tick(survivor.morale, survivor.hoursSinceMoraleEvent, survivor.traits);
      survivor.hunger = Math.max(0, survivor.hunger - 0.5 * deltaHours);
      survivor.stamina = Math.min(DEFAULT_STAT, survivor.stamina + 1.5 * deltaHours);
      if (survivor.hunger <= 10) {
        survivor.morale = this.morale.apply(survivor.morale, { type: "resource_shortage", intensity: 0.5 }, survivor.traits);
        survivor.hoursSinceMoraleEvent = 0;
      }
    });
  }

  getRoster(): SurvivorSummary[] {
    return Array.from(this.survivors.values()).map(survivor => ({
      ...survivor,
      relationships: Array.from(this.survivors.values())
        .filter(other => other.id !== survivor.id)
        .map(other => ({ id: other.id, value: this.relationships.get(survivor.id, other.id) }))
    }));
  }

  getSurvivor(id: string): SurvivorSummary | undefined {
    const survivor = this.survivors.get(id);
    if (!survivor) return undefined;
    return {
      ...survivor,
      relationships: Array.from(this.survivors.values())
        .filter(other => other.id !== survivor.id)
        .map(other => ({ id: other.id, value: this.relationships.get(survivor.id, other.id) }))
    };
  }

  getJobs(): SurvivorJobDefinition[] {
    return [...this.jobs.values()];
  }

  assignJob(id: string, jobId: string | null): boolean {
    const survivor = this.survivors.get(id);
    if (!survivor) {
      return false;
    }
    if (jobId && !this.jobs.has(jobId)) {
      return false;
    }
    survivor.job = jobId;
    return true;
  }

  recordMoraleEvent(id: string, event: MoraleEvent): number | null {
    const survivor = this.survivors.get(id);
    if (!survivor) {
      return null;
    }
    survivor.morale = this.morale.apply(survivor.morale, event, survivor.traits);
    survivor.hoursSinceMoraleEvent = 0;
    return survivor.morale;
  }

  adjustRelationship(a: string, b: string, delta: number): number {
    return this.relationships.adjust(a, b, delta);
  }

  recruit(options: RecruitOptions): Survivor {
    const id = `survivor_${Date.now().toString(36)}_${Math.floor(Math.random() * 999)}`;
    const skills: Record<string, SkillState> = {};
    Object.entries(options.skills).forEach(([skillId, level]) => {
      skills[skillId] = { level, xp: this.levelToXp(level) };
    });
    const ensured = this.skillProgression.ensure(skills);
    const survivor: Survivor = {
      id,
      name: options.name,
      background: options.background,
      traits: options.traits,
      morale: 65,
      hunger: DEFAULT_STAT,
      stamina: DEFAULT_STAT,
      health: DEFAULT_STAT,
      skills: ensured,
      injuries: [],
      job: null,
      hoursSinceMoraleEvent: 0,
      status: "active"
    };
    this.survivors.set(id, survivor);
    return survivor;
  }

  private seedStartingRoster(): void {
    content.survivors.starting_roster.forEach(template => {
      const survivor = this.recruit({
        name: template.name,
        background: template.background,
        traits: template.traits,
        skills: template.skills
      });
      survivor.id = template.id;
      this.survivors.set(template.id, survivor);
    });

    const roster = [...this.survivors.values()];
    for (let i = 0; i < roster.length; i += 1) {
      for (let j = i + 1; j < roster.length; j += 1) {
        const compatibility = this.computeCompatibility(roster[i].traits, roster[j].traits);
        this.relationships.adjust(roster[i].id, roster[j].id, compatibility);
      }
    }
  }

  private computeCompatibility(aTraits: string[], bTraits: string[]): number {
    let score = 0;
    if (aTraits.includes("optimist") && bTraits.includes("pessimist")) {
      score -= 30;
    }
    if (aTraits.includes("optimist") && bTraits.includes("optimist")) {
      score += 15;
    }
    if (aTraits.includes("brave") && bTraits.includes("cowardly")) {
      score -= 20;
    }
    if (aTraits.includes("night_owl") && bTraits.includes("night_owl")) {
      score += 10;
    }
    if (aTraits.includes("fast_learner") || bTraits.includes("fast_learner")) {
      score += 5;
    }
    return score;
  }

  private levelToXp(level: number): number {
    if (level <= 0) return 0;
    return level * level * 50;
  }
}
