import type { TrailerDefinition } from "../data/ContentRegistry";

interface CargoCell {
  label: string;
  condition?: number;
}

export class TransparentCargoHUD {
  private readonly element: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly grid: HTMLDivElement;

  constructor(label: string) {
    this.element = document.createElement("div");
    this.element.className = "transparent-cargo";
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-label", label);

    this.title = document.createElement("h2");
    this.title.className = "transparent-cargo__title";
    this.title.innerText = label;

    this.grid = document.createElement("div");
    this.grid.className = "transparent-cargo__grid";

    this.element.append(this.title, this.grid);
    document.body.append(this.element);
    this.hide();
  }

  showForTrailer(trailer: TrailerDefinition, cells: CargoCell[]): void {
    this.title.innerText = trailer.name;
    this.grid.style.setProperty("--columns", trailer.grid[0].toString());
    this.grid.style.setProperty("--rows", trailer.grid[1].toString());
    this.grid.replaceChildren(...cells.map(cell => this.renderCell(cell)));
    this.show();
  }

  hide(): void {
    this.element.style.display = "none";
  }

  private show(): void {
    this.element.style.display = "flex";
  }

  private renderCell(cell: CargoCell): HTMLDivElement {
    const div = document.createElement("div");
    div.className = "transparent-cargo__cell";
    div.innerText = cell.label;
    if (typeof cell.condition === "number") {
      div.setAttribute("data-condition", cell.condition.toFixed(0));
    }
    return div;
  }
}
