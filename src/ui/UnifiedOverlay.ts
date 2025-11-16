import type { InputManager, InputEventName } from "../engine/Input";

interface OverlayTabOptions {
  id: string;
  label: string;
  element: HTMLElement;
  icon?: string;
  hotkeys?: InputEventName[];
  onOpen?: () => void;
  onClose?: () => void;
}

interface RegisteredTab extends OverlayTabOptions {
  button: HTMLButtonElement;
}

export class UnifiedOverlay {
  private readonly root: HTMLDivElement;
  private readonly tabsBar: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly tabMap = new Map<string, RegisteredTab>();
  private activeTabId: string | null = null;

  constructor(private readonly input: InputManager) {
    this.root = document.createElement("div");
    this.root.className = "unified-overlay hidden";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Survival systems overlay");

    this.tabsBar = document.createElement("div");
    this.tabsBar.className = "unified-overlay__tabs";

    this.body = document.createElement("div");
    this.body.className = "unified-overlay__body";

    this.closeButton = document.createElement("button");
    this.closeButton.type = "button";
    this.closeButton.className = "unified-overlay__close";
    this.closeButton.innerText = "×";
    this.closeButton.addEventListener("click", () => this.hide());

    this.root.append(this.tabsBar, this.body, this.closeButton);
    document.body.append(this.root);
  }

  registerTab(options: OverlayTabOptions): void {
    if (this.tabMap.has(options.id)) {
      throw new Error(`Overlay tab ${options.id} already registered`);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "unified-overlay__tab";
    button.dataset.tab = options.id;
    button.innerHTML = `${options.icon ? `<span class="unified-overlay__tab-icon">${options.icon}</span>` : ""}<span>${
      options.label
    }</span>`;
    button.addEventListener("click", () => this.toggleTab(options.id));
    this.tabsBar.append(button);

    options.element.classList.add("unified-overlay__panel");
    options.element.classList.add("hidden");
    this.body.append(options.element);

    const registered: RegisteredTab = { ...options, button };
    this.tabMap.set(options.id, registered);

    options.hotkeys?.forEach(binding => {
      this.input.on(binding, () => this.toggleTab(options.id));
    });
  }

  toggleTab(id: string): void {
    if (this.activeTabId === id) {
      this.hide();
      return;
    }
    this.showTab(id);
  }

  showTab(id: string): void {
    if (!this.tabMap.has(id)) {
      return;
    }
    if (this.activeTabId && this.activeTabId !== id) {
      this.hideTab(this.activeTabId);
    }
    const tab = this.tabMap.get(id)!;
    this.activeTabId = id;
    this.root.classList.remove("hidden");
    tab.element.classList.remove("hidden");
    tab.button.classList.add("is-active");
    tab.onOpen?.();
  }

  hide(): void {
    if (!this.activeTabId) {
      this.root.classList.add("hidden");
      return;
    }
    this.hideTab(this.activeTabId);
    this.activeTabId = null;
    this.root.classList.add("hidden");
  }

  private hideTab(id: string): void {
    const tab = this.tabMap.get(id);
    if (!tab) {
      return;
    }
    tab.element.classList.add("hidden");
    tab.button.classList.remove("is-active");
    tab.onClose?.();
  }
}
