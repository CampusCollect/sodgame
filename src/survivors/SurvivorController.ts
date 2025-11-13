import type { InputManager } from "../engine/Input";
import { SurvivorManager, type SurvivorSummary } from "./SurvivorManager";
import { SurvivorPanel } from "../ui/SurvivorPanel";
import type { MoraleEventType } from "./MoraleSystem";

const HOURS_PER_SECOND = 1 / 60; // 1 in-game hour per real-time minute

export class SurvivorController {
  private readonly manager = new SurvivorManager();
  private readonly panel: SurvivorPanel;
  private accumulator = 0;

  constructor(private readonly input: InputManager) {
    this.panel = new SurvivorPanel({
      onAssignJob: (survivorId, jobId) => {
        this.manager.assignJob(survivorId, jobId);
        this.syncPanel();
      },
      onMoraleEvent: (survivorId, event) => {
        this.handleMoraleEvent(survivorId, event as MoraleEventType);
      }
    });

    this.input.on("toggle-survivors", () => this.toggle());
  }

  update(deltaSeconds: number): void {
    this.accumulator += deltaSeconds;
    if (this.accumulator >= 1) {
      const hours = this.accumulator * HOURS_PER_SECOND;
      this.manager.update(hours);
      this.accumulator = 0;
      if (this.panel.isOpen()) {
        this.syncPanel();
      }
    }
  }

  toggle(force?: boolean): void {
    const shouldOpen = force ?? !this.panel.isOpen();
    if (shouldOpen) {
      this.syncPanel();
      this.panel.show();
    } else {
      this.panel.hide();
    }
  }

  private syncPanel(): void {
    this.panel.setData(this.manager.getRoster(), this.manager.getJobs());
  }

  private handleMoraleEvent(survivorId: string, type: MoraleEventType): void {
    this.manager.recordMoraleEvent(survivorId, { type });
    if (type === "argument") {
      const roster = this.manager.getRoster();
      const survivor = roster.find(s => s.id === survivorId);
      if (survivor) {
        const target = [...survivor.relationships].sort((a, b) => a.value - b.value)[0];
        if (target) {
          this.manager.adjustRelationship(survivorId, target.id, -10);
        }
      }
    }
    if (type === "completed_mission" || type === "victory") {
      const roster = this.manager.getRoster();
      roster
        .filter(s => s.id !== survivorId)
        .forEach(other => {
          this.manager.recordMoraleEvent(other.id, { type: "victory", intensity: 0.3 });
          this.manager.adjustRelationship(survivorId, other.id, 5);
        });
    }
    this.syncPanel();
  }

  getRosterSnapshot(): SurvivorSummary[] {
    return this.manager.getRoster();
  }

  getCommunityPowerScore(): number {
    const roster = this.manager.getRoster();
    if (!roster.length) {
      return 0;
    }
    const skillTotals = roster.map(survivor =>
      Object.values(survivor.skills).reduce((sum, skill) => sum + skill.level, 0)
    );
    const averageSkill = skillTotals.reduce((a, b) => a + b, 0) / roster.length;
    const moraleAverage = roster.reduce((sum, survivor) => sum + survivor.morale, 0) / roster.length;
    const jobAssignments = roster.filter(survivor => survivor.job).length;
    const score = averageSkill + moraleAverage / 20 + jobAssignments;
    return Number(score.toFixed(2));
  }
}
