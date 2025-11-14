export class LightIndicator {
  private readonly container: HTMLDivElement;
  private readonly badge: HTMLDivElement;
  private readonly detail: HTMLDivElement;

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "light-indicator";
    this.badge = document.createElement("div");
    this.badge.className = "light-indicator__badge";
    this.detail = document.createElement("div");
    this.detail.className = "light-indicator__detail";
    this.container.append(this.badge, this.detail);
    document.body.append(this.container);
  }

  setLighting(level: number, timeOfDay: number, visibility: number): void {
    const clamped = Math.max(0, Math.min(1, level));
    const pct = Math.round(clamped * 100);
    this.badge.innerText = pct >= 60 ? "☀" : pct >= 30 ? "☾" : "✦";
    this.badge.style.setProperty("--light-level", clamped.toString());
    const timeLabel = `${timeOfDay.toFixed(1)}h`;
    this.detail.innerText = `Light ${pct}% · Visibility ${visibility.toFixed(0)} · ${timeLabel}`;
  }
}
