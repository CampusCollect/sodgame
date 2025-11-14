export type StockpileResource =
  | "food"
  | "meds"
  | "materials"
  | "fuel"
  | "ammo"
  | "parts"
  | "luxury"
  | "intel";

export type StockpileSnapshot = Record<StockpileResource, number>;

const DEFAULT_STOCKPILE: StockpileSnapshot = {
  food: 0,
  meds: 0,
  materials: 0,
  fuel: 0,
  ammo: 0,
  parts: 0,
  luxury: 0,
  intel: 0
};

const RESOURCE_VALUES: Record<StockpileResource, number> = {
  food: 1,
  meds: 4,
  materials: 2,
  fuel: 3,
  ammo: 2.5,
  parts: 2,
  luxury: 1.5,
  intel: 3
};

export class BaseStockpile {
  private stock: StockpileSnapshot = { ...DEFAULT_STOCKPILE };

  add(resource: StockpileResource, amount: number): void {
    if (!this.stock[resource]) {
      this.stock[resource] = 0;
    }
    this.stock[resource] = Number(Math.max(0, this.stock[resource] + amount).toFixed(2));
  }

  consume(resource: StockpileResource, amount: number): boolean {
    if (this.stock[resource] === undefined || this.stock[resource] < amount) {
      return false;
    }
    this.stock[resource] = Number(Math.max(0, this.stock[resource] - amount).toFixed(2));
    return true;
  }

  get(resource: StockpileResource): number {
    return this.stock[resource] ?? 0;
  }

  getTotals(): StockpileSnapshot {
    return { ...this.stock };
  }

  getValueScore(): number {
    return (Object.entries(this.stock) as [StockpileResource, number][]) // type cast for TS
      .reduce((total, [resource, amount]) => total + amount * (RESOURCE_VALUES[resource] ?? 1), 0);
  }

  serialize(): StockpileSnapshot {
    return this.getTotals();
  }

  load(snapshot?: Partial<StockpileSnapshot>): void {
    this.stock = { ...DEFAULT_STOCKPILE, ...(snapshot ?? {}) };
  }
}
