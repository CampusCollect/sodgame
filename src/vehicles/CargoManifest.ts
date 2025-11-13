import type { TrailerDefinition } from "../data/ContentRegistry";

export interface CargoEntry {
  id: string;
  label: string;
  weightKg: number;
  condition: number;
  size: [number, number];
}

export interface CargoRenderCell {
  placement?: CargoPlacement;
  isOrigin: boolean;
  width: number;
  height: number;
}

export interface CargoRenderState {
  columns: number;
  rows: number;
  cells: CargoRenderCell[];
  totalWeightKg: number;
  capacityKg: number;
}

interface CargoPlacement {
  entry: CargoEntry;
  position: { col: number; row: number };
}

export class CargoManifest {
  readonly trailer: TrailerDefinition;
  private readonly placements: CargoPlacement[] = [];

  constructor(trailer: TrailerDefinition) {
    this.trailer = trailer;
  }

  add(entry: CargoEntry): boolean {
    if (this.getTotalWeight() + entry.weightKg > this.trailer.weight_limit_kg) {
      return false;
    }
    const [width, height] = entry.size;
    for (let row = 0; row <= this.trailer.grid[1] - height; row += 1) {
      for (let col = 0; col <= this.trailer.grid[0] - width; col += 1) {
        if (this.canPlace(col, row, width, height)) {
          this.placements.push({ entry, position: { col, row } });
          return true;
        }
      }
    }
    return false;
  }

  getRenderState(): CargoRenderState {
    const columns = this.trailer.grid[0];
    const rows = this.trailer.grid[1];
    const cells: CargoRenderCell[] = Array.from({ length: columns * rows }, () => ({
      isOrigin: false,
      width: 1,
      height: 1
    }));

    this.placements.forEach(placement => {
      const [width, height] = placement.entry.size;
      for (let dy = 0; dy < height; dy += 1) {
        for (let dx = 0; dx < width; dx += 1) {
          const col = placement.position.col + dx;
          const row = placement.position.row + dy;
          const index = row * columns + col;
          const isOrigin = dx === 0 && dy === 0;
          cells[index] = {
            placement,
            isOrigin,
            width,
            height
          };
        }
      }
    });

    return {
      columns,
      rows,
      cells,
      totalWeightKg: this.getTotalWeight(),
      capacityKg: this.trailer.weight_limit_kg
    };
  }

  getTotalWeight(): number {
    return this.placements.reduce((total, placement) => total + placement.entry.weightKg, 0);
  }

  private canPlace(col: number, row: number, width: number, height: number): boolean {
    return this.placements.every(placement => {
      const [w, h] = placement.entry.size;
      const leftA = col;
      const rightA = col + width;
      const topA = row;
      const bottomA = row + height;
      const leftB = placement.position.col;
      const rightB = placement.position.col + w;
      const topB = placement.position.row;
      const bottomB = placement.position.row + h;
      const separated = rightA <= leftB || leftA >= rightB || bottomA <= topB || topA >= bottomB;
      return separated;
    });
  }
}
