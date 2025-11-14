type InputEventName =
  | "toggle-inventory"
  | "toggle-crafting"
  | "toggle-building"
  | "toggle-facilities"
  | "toggle-survivors"
  | "toggle-raids"
  | "interact"
  | "toggle-vehicle-cargo"
  | "use-stealth-tool"
  | "cycle-stealth-tool"
  | "use-grenade"
  | "cycle-grenade"
  | "reload-weapon"
  | "melee-attack"
  | "cycle-weapon"
  | "toggle-weapon-mods"
  | "quick-heal"
  | "quick-save"
  | "quick-load"
  | "mouse-move";

type InputListener = () => void;

type ListenerMap = {
  [K in InputEventName]?: InputListener[];
};

const KEY_BINDINGS: Record<string, InputEventName> = {
  Tab: "toggle-inventory",
  c: "toggle-crafting",
  C: "toggle-crafting",
  b: "toggle-building",
  B: "toggle-building",
  n: "toggle-facilities",
  N: "toggle-facilities",
  j: "toggle-survivors",
  J: "toggle-survivors",
  r: "toggle-raids",
  R: "toggle-raids",
  e: "interact",
  E: "interact",
  v: "toggle-vehicle-cargo",
  V: "toggle-vehicle-cargo",
  x: "use-stealth-tool",
  X: "use-stealth-tool",
  z: "cycle-stealth-tool",
  Z: "cycle-stealth-tool",
  g: "use-grenade",
  G: "cycle-grenade",
  h: "quick-heal",
  H: "quick-heal",
  f: "reload-weapon",
  F: "reload-weapon",
  q: "melee-attack",
  Q: "melee-attack",
  t: "toggle-weapon-mods",
  T: "toggle-weapon-mods",
  "1": "cycle-weapon",
  F5: "quick-save",
  F9: "quick-load"
};

export class InputManager {
  private readonly keys = new Set<string>();
  private readonly listeners: ListenerMap = {};
  private mousePosition = { x: 0, y: 0 };
  private readonly mouseButtons = new Set<number>();

  constructor(private readonly element: HTMLElement) {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    element.addEventListener("mousemove", this.handleMouseMove);
    element.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.element.removeEventListener("mousemove", this.handleMouseMove);
    this.element.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  update(): void {
    // placeholder for gamepad support or buffered inputs
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  getMousePosition(): { x: number; y: number } {
    return this.mousePosition;
  }

  isMouseDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  on(event: InputEventName, listener: InputListener): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]?.push(listener);
  }

  private emit(event: InputEventName): void {
    this.listeners[event]?.forEach(listener => listener());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.shouldIgnoreHotkey(event)) {
      return;
    }
    this.keys.add(event.key.toLowerCase());
    const binding = KEY_BINDINGS[event.key];
    if (binding) {
      event.preventDefault();
      this.emit(binding);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.key.toLowerCase());
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    this.mousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private handleMouseDown(event: MouseEvent): void {
    this.mouseButtons.add(event.button);
    if (event.button === 0) {
      event.preventDefault();
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    this.mouseButtons.delete(event.button);
  }

  private shouldIgnoreHotkey(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return false;
    }
    const tagName = target.tagName?.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select") {
      return true;
    }
    if (target.isContentEditable) {
      return true;
    }
    if (target.closest("[data-hotkeys='ignore']")) {
      return true;
    }
    return false;
  }
}
