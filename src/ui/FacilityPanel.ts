import type { FacilityDefinition } from "../data/ContentRegistry";
import type { FacilityView } from "../building/FacilityManager";
import type { StockpileSnapshot } from "../building/BaseStockpile";

interface FacilityPanelProps {
  onBuild: (facilityId: string) => void;
  onUpgrade: (facilityId: string) => void;
}

interface FacilityPanelData {
  available: FacilityDefinition[];
  facilities: FacilityView[];
  stockpile: StockpileSnapshot;
  message?: { text: string; error: boolean };
}

export class FacilityPanel {
  private readonly root: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly stockpileSection: HTMLDivElement;
  private readonly availableSection: HTMLDivElement;
  private readonly facilitySection: HTMLDivElement;
  private readonly message: HTMLDivElement;
  private open = false;

  constructor(private readonly props: FacilityPanelProps) {
    this.root = document.createElement("div");
    this.root.className = "facility-panel hidden";

    this.header = document.createElement("div");
    this.header.className = "facility-panel__header";
    this.header.innerHTML = `<strong>Facilities</strong><span>Press N to close</span>`;

    this.stockpileSection = document.createElement("div");
    this.stockpileSection.className = "facility-panel__stockpile";

    this.availableSection = document.createElement("div");
    this.availableSection.className = "facility-panel__available";

    this.facilitySection = document.createElement("div");
    this.facilitySection.className = "facility-panel__list";

    this.message = document.createElement("div");
    this.message.className = "facility-panel__message";

    this.root.append(this.header, this.stockpileSection, this.availableSection, this.facilitySection, this.message);
  }

  getElement(): HTMLDivElement {
    return this.root;
  }

  show(): void {
    this.open = true;
    this.root.classList.remove("hidden");
  }

  hide(): void {
    this.open = false;
    this.root.classList.add("hidden");
  }

  isOpen(): boolean {
    return this.open;
  }

  setData(data: FacilityPanelData): void {
    this.renderStockpile(data.stockpile);
    this.renderAvailable(data.available);
    this.renderFacilities(data.facilities);
    if (data.message) {
      this.message.textContent = data.message.text;
      this.message.dataset.state = data.message.error ? "error" : "ok";
    } else {
      this.message.textContent = "";
      delete this.message.dataset.state;
    }
  }

  private renderStockpile(stockpile: StockpileSnapshot): void {
    this.stockpileSection.innerHTML = `<h4>Base Stockpile</h4>`;
    const grid = document.createElement("div");
    grid.className = "facility-panel__stockpile-grid";
    Object.entries(stockpile).forEach(([resource, amount]) => {
      const cell = document.createElement("div");
      cell.className = "facility-panel__stockpile-cell";
      cell.innerHTML = `<span>${resource}</span><strong>${amount.toFixed(1)}</strong>`;
      grid.append(cell);
    });
    this.stockpileSection.append(grid);
  }

  private renderAvailable(definitions: FacilityDefinition[]): void {
    this.availableSection.innerHTML = `<h4>Blueprints</h4>`;
    if (!definitions.length) {
      const empty = document.createElement("p");
      empty.textContent = "All starter facilities built.";
      this.availableSection.append(empty);
      return;
    }
    definitions.forEach(definition => {
      const tier = definition.tiers[0];
      const row = document.createElement("div");
      row.className = "facility-panel__available-row";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `Build ${definition.name}`;
      button.addEventListener("click", () => this.props.onBuild(definition.id));
      const costList = document.createElement("ul");
      costList.className = "facility-panel__costs";
      Object.entries(tier.build_cost).forEach(([itemId, qty]) => {
        const item = document.createElement("li");
        item.textContent = `${qty}× ${itemId}`;
        costList.append(item);
      });
      row.append(button, costList);
      this.availableSection.append(row);
    });
  }

  private renderFacilities(facilities: FacilityView[]): void {
    this.facilitySection.innerHTML = `<h4>Active Facilities</h4>`;
    if (!facilities.length) {
      const empty = document.createElement("p");
      empty.textContent = "No facilities built yet.";
      this.facilitySection.append(empty);
      return;
    }
    facilities.forEach(facility => {
      const card = document.createElement("article");
      card.className = "facility-panel__facility";
      const tier = facility.tier;
      const status = facility.status === "building"
        ? `Building (${Math.ceil(facility.remainingBuildSeconds)}s)`
        : facility.powered
          ? "Online"
          : "No Power";
      card.innerHTML = `
        <header>
          <strong>${facility.definition.name}</strong>
          <span>Tier ${tier.tier} • Slots ${tier.slots}</span>
        </header>
        <p class="facility-panel__status">${status}</p>
        <p class="facility-panel__status">Efficiency ${(facility.efficiency * 100).toFixed(0)}%</p>
      `;
      if (facility.status === "active" && facility.lastOutput.length) {
        const output = document.createElement("ul");
        output.className = "facility-panel__output";
        facility.lastOutput.forEach(entry => {
          const item = document.createElement("li");
          item.textContent = `+${entry.amount.toFixed(2)} ${entry.resource}`;
          output.append(item);
        });
        card.append(output);
      }
      if (facility.tierIndex < facility.definition.tiers.length - 1 && facility.status !== "building") {
        const upgrade = document.createElement("button");
        upgrade.type = "button";
        upgrade.className = "facility-panel__upgrade";
        upgrade.textContent = "Upgrade";
        upgrade.addEventListener("click", () => this.props.onUpgrade(facility.id));
        card.append(upgrade);
      }
      this.facilitySection.append(card);
    });
  }
}
