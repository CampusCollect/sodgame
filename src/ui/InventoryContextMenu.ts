interface MenuAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  description?: string;
}

export class InventoryContextMenu {
  private readonly root: HTMLUListElement;

  constructor() {
    this.root = document.createElement("ul");
    this.root.className = "inventory-context hidden";
    document.body.append(this.root);
    document.addEventListener("click", () => this.hide());
  }

  show(x: number, y: number, actions: MenuAction[]): void {
    this.root.replaceChildren(
      ...actions.map(action => {
        const item = document.createElement("li");
        item.className = "inventory-context__item";
        if (action.disabled) {
          item.dataset.disabled = "true";
        }
        item.innerHTML = `<strong>${action.label}</strong>${action.description ? `<span>${action.description}</span>` : ""}`;
        item.addEventListener("click", event => {
          event.stopPropagation();
          if (action.disabled) {
            return;
          }
          this.hide();
          action.onSelect();
        });
        return item;
      })
    );
    this.root.style.left = `${x}px`;
    this.root.style.top = `${y}px`;
    this.root.classList.remove("hidden");
  }

  hide(): void {
    this.root.classList.add("hidden");
  }
}
