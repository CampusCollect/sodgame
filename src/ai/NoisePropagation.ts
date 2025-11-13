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

export class NoisePropagation {
  private readonly definitions: Map<string, NoiseClassDefinition> = new Map();
  private readonly events: NoiseEvent[] = [];
  private counter = 0;

  constructor(classes: NoiseClassDefinition[]) {
    classes.forEach(def => this.definitions.set(def.id, def));
  }

  emit(classId: string, position: Vector2): NoiseEvent | null {
    const definition = this.definitions.get(classId);
    if (!definition) {
      console.warn(`Noise class ${classId} missing`);
      return null;
    }
    const event: NoiseEvent = {
      id: `noise_${this.counter += 1}`,
      classId,
      position,
      intensity: definition.intensity,
      range: definition.range_m,
      duration: definition.duration_s,
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
}
