import type { RaidPlannerSnapshot } from "../factions/RaidPlanner";

interface RaidPlanningUIOptions {
  onAmbush: (convoyId: string) => void;
  onTrack: (convoyId: string | null) => void;
}

interface LogEntry {
  id: string;
  message: string;
}

const formatHours = (hours: number): string => {
  if (hours <= 0) {
    return "Now";
  }
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  return `${hours.toFixed(1)}h`;
};

export class RaidPlanningUI {
  private readonly root: HTMLDivElement;
  private readonly factionList: HTMLDivElement;
  private readonly convoyList: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly logList: HTMLUListElement;
  private readonly filterInput: HTMLInputElement;
  private readonly clearFilterButton: HTMLButtonElement;
  private open = false;
  private snapshot: RaidPlannerSnapshot | null = null;
  private logs: LogEntry[] = [];
  private selectedFactionId: string | null = null;
  private searchTerm = "";
  private trackedConvoyId: string | null = null;

  constructor(private readonly options: RaidPlanningUIOptions) {
    this.root = document.createElement("div");
    this.root.className = "raid-panel hidden";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Raid planning");

    const title = document.createElement("h2");
    title.textContent = "Raid Planner";
    title.className = "raid-panel__title";

    this.status = document.createElement("div");
    this.status.className = "raid-panel__status";
    this.status.setAttribute("aria-live", "polite");

    this.hint = document.createElement("div");
    this.hint.className = "raid-panel__hint";
    this.hint.innerText = "Click a faction to filter, search intel below, and track a convoy to pin it.";

    this.factionList = document.createElement("div");
    this.factionList.className = "raid-panel__factions";

    this.convoyList = document.createElement("div");
    this.convoyList.className = "raid-panel__convoys";

    this.filterInput = document.createElement("input");
    this.filterInput.type = "search";
    this.filterInput.placeholder = "Filter by cargo, route, or faction";
    this.filterInput.className = "raid-panel__search";
    this.filterInput.setAttribute("aria-label", "Filter convoys");
    this.filterInput.setAttribute("data-hotkeys", "ignore");
    this.filterInput.addEventListener("input", () => {
      this.searchTerm = this.filterInput.value.trim().toLowerCase();
      this.renderConvoys();
      this.updateHint();
    });

    this.clearFilterButton = document.createElement("button");
    this.clearFilterButton.type = "button";
    this.clearFilterButton.className = "raid-panel__clear-filter";
    this.clearFilterButton.textContent = "Clear filters";
    this.clearFilterButton.addEventListener("click", () => {
      this.selectedFactionId = null;
      this.searchTerm = "";
      this.filterInput.value = "";
      this.render();
      this.updateHint();
    });

    const logWrapper = document.createElement("div");
    logWrapper.className = "raid-panel__log";

    const logHeading = document.createElement("h3");
    logHeading.textContent = "Intel Feed";

    this.logList = document.createElement("ul");
    this.logList.setAttribute("aria-live", "polite");

    logWrapper.append(logHeading, this.logList);
    this.root.append(title, this.status, this.hint, this.buildSplitColumns(), logWrapper);
  }

  getElement(): HTMLDivElement {
    return this.root;
  }

  isOpen(): boolean {
    return this.open;
  }

  show(): void {
    this.open = true;
    this.root.classList.remove("hidden");
  }

  hide(): void {
    this.open = false;
    this.root.classList.add("hidden");
  }

  setData(snapshot: RaidPlannerSnapshot): void {
    this.snapshot = snapshot;
    this.trackedConvoyId = snapshot.trackedConvoyId;
    if (this.open) {
      this.render();
    }
  }

  setStatus(message: string, isError = false): void {
    this.status.textContent = message;
    this.status.classList.toggle("raid-panel__status--error", isError);
  }

  pushLog(entry: string): void {
    const cryptoApi = typeof globalThis !== "undefined" ? (globalThis.crypto ?? undefined) : undefined;
    const id = cryptoApi?.randomUUID ? cryptoApi.randomUUID() : `${Date.now()}-${Math.random()}`;
    this.logs.unshift({ id, message: entry });
    this.logs = this.logs.slice(0, 6);
    this.renderLogs();
  }

  private buildSplitColumns(): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.className = "raid-panel__columns";

    const factionCol = document.createElement("div");
    factionCol.className = "raid-panel__column";
    const factionHeading = document.createElement("h3");
    factionHeading.textContent = "Factions";
    factionCol.append(factionHeading, this.factionList);

    const convoyCol = document.createElement("div");
    convoyCol.className = "raid-panel__column";
    const convoyHeading = document.createElement("h3");
    convoyHeading.textContent = "Convoys";
    const controls = document.createElement("div");
    controls.className = "raid-panel__controls";
    controls.append(this.filterInput, this.clearFilterButton);
    convoyCol.append(convoyHeading, controls, this.convoyList);

    wrapper.append(factionCol, convoyCol);
    return wrapper;
  }

  private render(): void {
    if (!this.snapshot) {
      return;
    }
    this.renderFactions();
    this.renderConvoys();
    this.renderLogs();
    this.updateHint();
  }

  private renderFactions(): void {
    if (!this.snapshot) {
      return;
    }
    this.factionList.replaceChildren();
    if (this.snapshot.factions.length === 0) {
      this.factionList.textContent = "No known factions.";
      return;
    }

    for (const faction of this.snapshot.factions) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "raid-panel__faction";
      row.innerHTML = `<strong>${faction.name}</strong><span>${faction.reputation} (${faction.standing})</span>`;
      if (this.selectedFactionId === faction.id) {
        row.dataset.active = "true";
      }
      row.addEventListener("click", () => {
        this.selectedFactionId = this.selectedFactionId === faction.id ? null : faction.id;
        this.render();
      });
      this.factionList.append(row);
    }
  }

  private renderConvoys(): void {
    if (!this.snapshot) {
      return;
    }
    this.convoyList.replaceChildren();
    let convoys = [...this.snapshot.convoys];
    if (this.selectedFactionId) {
      convoys = convoys.filter(convoy => convoy.factionId === this.selectedFactionId);
    }
    if (this.searchTerm) {
      convoys = convoys.filter(convoy => {
        const haystack = `${convoy.factionName} ${convoy.cargo.join(" ")} ${convoy.route.join(" ")}`.toLowerCase();
        return haystack.includes(this.searchTerm);
      });
    }
    if (convoys.length === 0) {
      this.convoyList.textContent = "No convoys match your filters.";
      return;
    }

    for (const convoy of convoys) {
      const card = document.createElement("div");
      card.className = `raid-panel__convoy raid-panel__convoy--${convoy.state}`;
      if (this.trackedConvoyId && this.trackedConvoyId === convoy.id) {
        card.dataset.tracked = "true";
      }

      const header = document.createElement("header");
      header.innerHTML = `<strong>${convoy.factionName}</strong> · ${convoy.route.join(" → ")}`;
      card.append(header);

      const meta = document.createElement("p");
      meta.className = "raid-panel__convoy-meta";
      meta.innerText = `Cargo: ${convoy.cargo.join(", ")} | Escorts: ${convoy.guards} + ${convoy.escortVehicles} vehicles`;
      card.append(meta);

      const statusLine = document.createElement("div");
      statusLine.className = "raid-panel__convoy-status";
      const intel = convoy.intelRevealed ? "Intel ready" : "No intel";
      statusLine.textContent = `ETA: ${formatHours(convoy.etaHours)} · ${intel}`;
      card.append(statusLine);

      const actions = document.createElement("div");
      actions.className = "raid-panel__actions";

      const trackButton = document.createElement("button");
      trackButton.type = "button";
      trackButton.className = "raid-panel__track";
      const isTracked = this.trackedConvoyId === convoy.id;
      trackButton.textContent = isTracked ? "Untrack" : "Track";
      trackButton.dataset.active = isTracked ? "true" : "false";
      trackButton.addEventListener("click", () => this.options.onTrack(isTracked ? null : convoy.id));
      actions.append(trackButton);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "raid-panel__convoy-button";
      button.textContent = convoy.canAmbush ? "Ambush" : "Await intel";
      button.disabled = !convoy.canAmbush;
      if (convoy.blockedReason) {
        button.title = convoy.blockedReason;
      }
      button.addEventListener("click", () => this.options.onAmbush(convoy.id));
      actions.append(button);

      card.append(actions);

      this.convoyList.append(card);
    }
  }

  private renderLogs(): void {
    this.logList.replaceChildren();
    if (this.logs.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No operations logged yet.";
      this.logList.append(empty);
      return;
    }
    for (const entry of this.logs) {
      const li = document.createElement("li");
      li.textContent = entry.message;
      this.logList.append(li);
    }
  }

  private updateHint(): void {
    const filters: string[] = [];
    if (this.selectedFactionId && this.snapshot) {
      const faction = this.snapshot.factions.find(f => f.id === this.selectedFactionId);
      if (faction) {
        filters.push(`Faction: ${faction.name}`);
      }
    }
    if (this.searchTerm) {
      filters.push(`Search: ${this.searchTerm}`);
    }
    if (filters.length === 0) {
      this.hint.textContent = "Click a faction to filter, search intel below, and track a convoy to pin it.";
    } else {
      this.hint.textContent = `Filters active – ${filters.join(" · ")}`;
    }
  }
}
