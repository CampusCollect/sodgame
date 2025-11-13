type InputEventName =
  | "toggle-inventory"
  | "toggle-crafting"
  | "toggle-building"
  | "toggle-survivors"
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
  j: "toggle-survivors",
  J: "toggle-survivors"
};

export class InputManager {
  private readonly keys = new Set<string>();
  private readonly listeners: ListenerMap = {};
  private mousePosition = { x: 0, y: 0 };

  constructor(private readonly element: HTMLElement) {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    element.addEventListener("mousemove", this.handleMouseMove);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.element.removeEventListener("mousemove", this.handleMouseMove);
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
}
