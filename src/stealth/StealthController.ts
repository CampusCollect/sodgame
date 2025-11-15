import type { Player } from "../entities/Player";
import type { InputManager } from "../engine/Input";
import { content } from "../data";
import { NoiseBus } from "./NoiseBus";
import { VisibilitySystem } from "./VisibilitySystem";
import { AlarmController } from "./AlarmController";
import { StealthTools } from "./StealthTools";
import { NoiseMeter } from "../ui/NoiseMeter";
import { LightIndicator } from "../ui/LightIndicator";

const FOOTSTEP_CLASSES: Record<string, string> = {
  crouch: "noise_footstep_crouch",
  walk: "noise_footstep_walk",
  sprint: "noise_footstep_walk"
};

export class StealthController {
  private readonly noise = new NoiseBus(content.noise_classes);
  private readonly visibility = new VisibilitySystem();
  private readonly alarms = new AlarmController();
  private readonly tools = new StealthTools(this.noise, content.stealth_tools);
  private readonly noiseMeter = new NoiseMeter();
  private readonly lightIndicator = new LightIndicator();
  private selectedToolIndex = 0;
  private footstepTimer = 0;
  private timeOfDay = 8; // 8am start

  constructor(private readonly player: Player, private readonly input: InputManager) {
    this.input.on("use-stealth-tool", () => this.useSelectedTool());
    this.input.on("cycle-stealth-tool", () => this.cycleTool());
  }

  getNoise(): NoiseBus {
    return this.noise;
  }

  update(delta: number): void {
    this.timeOfDay = (this.timeOfDay + delta * (24 / 3600)) % 24;
    this.noise.update(delta);
    this.tools.update(delta);
    this.alarms.update(delta);
    this.footstepTimer -= delta;
    this.emitMovementNoise();

    const noiseLevel = this.noise.getPerceivedLevel(this.player.position);
    const ambientLight = this.calculateAmbientLight();
    const visibilityScore = this.visibility.compute({
      stance: this.player.getStance(),
      movementIntensity: this.player.getMovementIntensity(),
      ambientLight,
      noiseLevel
    });

    this.noiseMeter.setLevel(noiseLevel);
    const selectedTool = this.tools.getTools()[this.selectedToolIndex];
    if (selectedTool) {
      this.noiseMeter.setToolStatus({
        name: selectedTool.definition.name,
        cooldown: selectedTool.cooldownRemaining
      });
    }
    this.lightIndicator.setLighting(ambientLight, this.timeOfDay, visibilityScore);

    if (noiseLevel > 75 && !this.alarms.hasActiveAlarm()) {
      this.alarms.trigger("player_noise", "medium", 10);
    }
  }

  private emitMovementNoise(): void {
    if (this.player.getMovementIntensity() <= 0.1) {
      return;
    }
    if (this.footstepTimer > 0) {
      return;
    }
    const stance = this.player.getStance();
    const classId = FOOTSTEP_CLASSES[stance];
    if (classId) {
      this.noise.emit(classId, { ...this.player.position });
    }
    this.footstepTimer = stance === "crouch" ? 0.45 : stance === "sprint" ? 0.2 : 0.3;
  }

  private calculateAmbientLight(): number {
    const radians = (this.timeOfDay / 24) * Math.PI * 2;
    const normalized = (Math.cos(radians - Math.PI) + 1) / 2; // 0 night, 1 day
    return 0.15 + normalized * 0.75;
  }

  private useSelectedTool(): void {
    const tool = this.tools.getTools()[this.selectedToolIndex];
    if (!tool) return;
    this.tools.use(tool.definition.id, this.player.position, this.player.direction);
  }

  private cycleTool(): void {
    const total = this.tools.getTools().length;
    if (total === 0) return;
    this.selectedToolIndex = (this.selectedToolIndex + 1) % total;
  }
}
