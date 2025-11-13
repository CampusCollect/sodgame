import type { TrailerDefinition, VehicleDefinition } from "../data/ContentRegistry";

export interface HitchState {
  attached: boolean;
  trailer?: TrailerDefinition;
  progress?: number;
}

export class TrailerHitch {
  private state: HitchState = { attached: false };

  constructor(private readonly tractor: VehicleDefinition) {}

  get current(): HitchState {
    return this.state;
  }

  attach(trailer: TrailerDefinition): void {
    if (!this.tractor.compatible_trailers.includes(trailer.id)) {
      throw new Error(`Trailer ${trailer.id} not compatible with ${this.tractor.id}`);
    }
    this.state = { attached: true, trailer, progress: 1 };
  }

  detach(): void {
    this.state = { attached: false };
  }
}
