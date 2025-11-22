import type { VehicleDefinition } from "../data/ContentRegistry";

export interface MaintenanceStatus {
  component: string;
  condition: number;
  tooltip: string;
}

export class MaintenanceUI {
  private readonly element: HTMLDivElement;
  private readonly list: HTMLUListElement;

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "maintenance-ui";
    this.element.setAttribute("role", "complementary");

    const title = document.createElement("h2");
    title.innerText = "Vehicle Maintenance";
    title.className = "maintenance-ui__title";

    this.list = document.createElement("ul");
    this.list.className = "maintenance-ui__list";

    this.element.append(title, this.list);
    this.hide();
  }

  getElement(): HTMLDivElement {
    return this.element;
  }

  show(vehicle: VehicleDefinition, statuses: MaintenanceStatus[]): void {
    this.list.replaceChildren(
      ...statuses.map(status => {
        const item = document.createElement("li");
        item.innerText = `${status.component}: ${Math.round(status.condition * 100)}%`;
        item.title = status.tooltip;
        return item;
      })
    );
    this.element.dataset.vehicle = vehicle.name;
    this.showElement();
  }

  hide(): void {
    this.element.style.display = "none";
  }

  private showElement(): void {
    this.element.style.display = "block";
  }
}
