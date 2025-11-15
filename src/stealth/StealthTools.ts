import type { StealthToolDefinition } from "../data/ContentRegistry";
import type { Vector2 } from "../entities/Player";
import { NoiseBus } from "./NoiseBus";

interface ToolState {
  definition: StealthToolDefinition;
  cooldownRemaining: number;
}

function normalize(vector: Vector2): Vector2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: vector.x / length, y: vector.y / length };
}

export class StealthTools {
  private readonly tools: ToolState[];

  constructor(private readonly noise: NoiseBus, definitions: StealthToolDefinition[]) {
    this.tools = definitions.map(def => ({ definition: def, cooldownRemaining: 0 }));
  }

  update(delta: number): void {
    this.tools.forEach(tool => {
      tool.cooldownRemaining = Math.max(0, tool.cooldownRemaining - delta);
    });
  }

  use(toolId: string, origin: Vector2, direction: Vector2): boolean {
    const tool = this.tools.find(entry => entry.definition.id === toolId);
    if (!tool || tool.cooldownRemaining > 0) {
      return false;
    }
    const normalizedDirection = normalize(direction);
    const distance = tool.definition.range_m * 4;
    const target: Vector2 = {
      x: origin.x + normalizedDirection.x * distance,
      y: origin.y + normalizedDirection.y * distance
    };
    this.noise.emit(tool.definition.noise_class, target, {
      duration: tool.definition.duration_override_s
    });
    tool.cooldownRemaining = tool.definition.cooldown_s;
    return true;
  }

  getTools(): ToolState[] {
    return this.tools;
  }
}
