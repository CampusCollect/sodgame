import type { CargoRenderState } from "../vehicles/CargoManifest";

export class TransparentCargoHUD {
  private readonly element: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly grid: HTMLDivElement;
  private readonly actions: HTMLDivElement;
  private readonly hint: HTMLParagraphElement;

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

    this.actions = document.createElement("div");
    this.actions.className = "transparent-cargo__actions";
    this.actions.style.display = "none";

    this.hint = document.createElement("p");
    this.hint.className = "transparent-cargo__hint";
    this.hint.style.display = "none";

    this.element.append(this.title, this.grid, this.actions, this.hint);
    document.body.append(this.element);
    this.hide();
  }

  syncFromManifest(state: CargoRenderState, label?: string): void {
    if (label) {
      this.title.innerText = label;
    }
    this.grid.style.setProperty("--columns", state.columns.toString());
    this.grid.style.setProperty("--rows", state.rows.toString());
    this.grid.innerHTML = "";

    state.cells.forEach((cell, index) => {
      if (cell.placement && !cell.isOrigin) {
        return;
      }
      const slot = document.createElement("div");
      slot.className = "transparent-cargo__cell";
      const column = index % state.columns;
      const row = Math.floor(index / state.columns);
      slot.style.gridColumnStart = String(column + 1);
      slot.style.gridRowStart = String(row + 1);
      if (cell.placement && cell.isOrigin) {
        slot.style.gridColumnEnd = `span ${cell.width}`;
        slot.style.gridRowEnd = `span ${cell.height}`;
        slot.innerText = `${cell.placement.entry.label}`;
        slot.setAttribute("data-condition", cell.placement.entry.condition.toFixed(0));
      }
      this.grid.append(slot);
    });
  }

  setActions(actions: { label: string; onClick: () => void; title?: string }[]): void {
    this.actions.innerHTML = "";
    if (actions.length === 0) {
      this.actions.style.display = "none";
      return;
    }
    this.actions.style.display = "flex";
    actions.forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "transparent-cargo__action";
      button.innerText = action.label;
      if (action.title) {
        button.title = action.title;
      }
      button.addEventListener("click", action.onClick);
      this.actions.append(button);
    });
  }

  setHint(text?: string): void {
    if (!text) {
      this.hint.style.display = "none";
      this.hint.innerText = "";
      return;
    }
    this.hint.style.display = "block";
    this.hint.innerText = text;
  }

  show(): void {
    this.element.style.display = "flex";
  }

  hide(): void {
    this.element.style.display = "none";
  }
}
