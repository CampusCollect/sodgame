import type { TrailerDefinition } from "../data/ContentRegistry";

export interface CargoEntry {
  id: string;
  label: string;
  weightKg: number;
  condition: number;
}

export class CargoManifest {
  readonly trailer: TrailerDefinition;
  private readonly cargo: CargoEntry[] = [];

  constructor(trailer: TrailerDefinition) {
    this.trailer = trailer;
  }

  get entries(): readonly CargoEntry[] {
    return this.cargo;
  }

  add(entry: CargoEntry): boolean {
    const weight = this.cargo.reduce((total, item) => total + item.weightKg, 0) + entry.weightKg;
    if (weight > this.trailer.weight_limit_kg) {
      return false;
    }
    this.cargo.push(entry);
    return true;
  }
}
