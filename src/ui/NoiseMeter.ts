interface ToolStatus {
  name: string;
  cooldown: number;
}

export class NoiseMeter {
  private readonly container: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly valueLabel: HTMLSpanElement;
  private readonly toolLabel: HTMLDivElement;

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "noise-meter";
    const bar = document.createElement("div");
    bar.className = "noise-meter__bar";
    this.fill = document.createElement("div");
    this.fill.className = "noise-meter__fill";
    this.valueLabel = document.createElement("span");
    this.valueLabel.className = "noise-meter__value";
    this.toolLabel = document.createElement("div");
    this.toolLabel.className = "noise-meter__tool";
    bar.append(this.fill, this.valueLabel);
    this.container.append(bar, this.toolLabel);
    document.body.append(this.container);
  }

  setLevel(level: number): void {
    const clamped = Math.max(0, Math.min(100, level));
    this.fill.style.width = `${clamped}%`;
    this.valueLabel.innerText = `${clamped.toFixed(0)} / 100`;
    this.fill.dataset.state = clamped > 70 ? "danger" : clamped > 40 ? "caution" : "safe";
  }

  setToolStatus(status: ToolStatus): void {
    const cooldownText = status.cooldown <= 0 ? "Ready" : `${status.cooldown.toFixed(0)}s`;
    this.toolLabel.innerText = `Tool: ${status.name} – ${cooldownText}`;
  }
}
