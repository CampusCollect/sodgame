import type { NoiseClassDefinition } from "../data/ContentRegistry";
import type { Vector2 } from "../entities/Player";

export interface NoiseEvent {
  id: string;
  classId: string;
  position: Vector2;
  intensity: number;
  range: number;
  duration: number;
  elapsed: number;
}

interface EmitOverrides {
  intensity?: number;
  range?: number;
  duration?: number;
}

export class NoiseBus {
  private readonly definitions: Map<string, NoiseClassDefinition> = new Map();
  private readonly events: NoiseEvent[] = [];
  private counter = 0;

  constructor(classes: NoiseClassDefinition[]) {
    classes.forEach(def => this.definitions.set(def.id, def));
  }

  emit(classId: string, position: Vector2, overrides: EmitOverrides = {}): NoiseEvent | null {
    const definition = this.definitions.get(classId);
    if (!definition) {
      console.warn(`Noise class ${classId} missing`);
      return null;
    }
    const event: NoiseEvent = {
      id: `noise_${this.counter += 1}`,
      classId,
      position: { ...position },
      intensity: overrides.intensity ?? definition.intensity,
      range: overrides.range ?? definition.range_m,
      duration: overrides.duration ?? definition.duration_s,
      elapsed: 0
    };
    this.events.push(event);
    return event;
  }

  update(delta: number): void {
    for (let i = this.events.length - 1; i >= 0; i -= 1) {
      const event = this.events[i];
      event.elapsed += delta;
      if (event.elapsed >= event.duration) {
        this.events.splice(i, 1);
      }
    }
  }

  getActiveEvents(): NoiseEvent[] {
    return this.events;
  }

  getPerceivedLevel(position: Vector2): number {
    let perceived = 0;
    for (const event of this.events) {
      const dx = position.x - event.position.x;
      const dy = position.y - event.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance > event.range) {
        continue;
      }
      const normalizedDistance = distance / Math.max(event.range, 1);
      const falloff = 1 / (1 + normalizedDistance * normalizedDistance);
      perceived = Math.max(perceived, Math.min(100, event.intensity * falloff));
    }
    return perceived;
  }
}
