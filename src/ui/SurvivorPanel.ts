import type { SurvivorSummary } from "../survivors/SurvivorManager";
import type { SurvivorJobDefinition } from "../data/ContentRegistry";

interface SurvivorPanelOptions {
  onAssignJob: (survivorId: string, jobId: string | null) => void;
  onMoraleEvent: (survivorId: string, event: string) => void;
}

export class SurvivorPanel {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLUListElement;
  private readonly detail: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;

  private roster: SurvivorSummary[] = [];
  private jobs: SurvivorJobDefinition[] = [];
  private selectedId: string | null = null;
  private open = false;

  constructor(private readonly options: SurvivorPanelOptions) {
    this.root = document.createElement("div");
    this.root.className = "survivor-panel hidden";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-label", "Survivor Roster");

    const header = document.createElement("header");
    header.className = "survivor-panel__header";
    const title = document.createElement("h2");
    title.textContent = "Survivors";
    this.closeButton = document.createElement("button");
    this.closeButton.type = "button";
    this.closeButton.className = "survivor-panel__close";
    this.closeButton.textContent = "×";
    this.closeButton.addEventListener("click", () => this.hide());
    header.append(title, this.closeButton);

    const body = document.createElement("div");
    body.className = "survivor-panel__body";

    this.list = document.createElement("ul");
    this.list.className = "survivor-panel__list";
    this.list.setAttribute("role", "listbox");

    this.detail = document.createElement("div");
    this.detail.className = "survivor-panel__detail";

    body.append(this.list, this.detail);
    this.root.append(header, body);
    document.body.append(this.root);
  }

  show(): void {
    this.open = true;
    this.root.classList.remove("hidden");
    this.render();
    this.focusSelected();
  }

  hide(): void {
    this.open = false;
    this.root.classList.add("hidden");
  }

  isOpen(): boolean {
    return this.open;
  }

  setData(roster: SurvivorSummary[], jobs: SurvivorJobDefinition[]): void {
    this.roster = roster;
    this.jobs = jobs;
    if (!this.selectedId && roster.length > 0) {
      this.selectedId = roster[0].id;
    }
    if (this.open) {
      this.render();
    }
  }

  private render(): void {
    this.list.innerHTML = "";
    this.roster.forEach(survivor => {
      const item = document.createElement("li");
      item.className = "survivor-panel__item";
      item.setAttribute("role", "option");
      item.tabIndex = 0;
      if (survivor.id === this.selectedId) {
        item.classList.add("is-selected");
        item.setAttribute("aria-selected", "true");
      }
      item.innerHTML = `
        <div>
          <strong>${survivor.name}</strong>
          <span>${survivor.job ? this.getJobName(survivor.job) : "Unassigned"}</span>
        </div>
        <span class="survivor-panel__morale">Morale ${survivor.morale.toFixed(0)}</span>
      `;
      item.addEventListener("click", () => {
        this.selectedId = survivor.id;
        this.render();
      });
      item.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.selectedId = survivor.id;
          this.render();
        }
      });
      this.list.append(item);
    });
    this.renderDetail();
  }

  private renderDetail(): void {
    const survivor = this.roster.find(s => s.id === this.selectedId);
    if (!survivor) {
      this.detail.innerHTML = `<p>Select a survivor to view details.</p>`;
      return;
    }

    const jobOptions = this.jobs
      .map(job => `<option value="${job.id}" ${survivor.job === job.id ? "selected" : ""}>${job.name}</option>`)
      .join("");
    const relationships = survivor.relationships
      .map(rel => `<li><span>${this.resolveName(rel.id)}</span><span>${rel.value}</span></li>`)
      .join("");
    const skills = Object.entries(survivor.skills)
      .map(([skillId, state]) => `<li><span>${skillId}</span><span>Lv ${state.level}</span></li>`)
      .join("");
    const traits = survivor.traits.map(trait => `<span class="trait-pill">${trait}</span>`).join("");

    this.detail.innerHTML = `
      <section class="survivor-panel__section">
        <header>
          <h3>${survivor.name}</h3>
          <p>${survivor.background}</p>
        </header>
        <div class="survivor-panel__stats">
          <div><span>Health</span><strong>${survivor.health.toFixed(0)}</strong></div>
          <div><span>Stamina</span><strong>${survivor.stamina.toFixed(0)}</strong></div>
          <div><span>Hunger</span><strong>${survivor.hunger.toFixed(0)}</strong></div>
          <div><span>Morale</span><strong>${survivor.morale.toFixed(0)}</strong></div>
        </div>
        <label class="survivor-panel__job">
          <span>Assignment</span>
          <select>
            <option value="">Unassigned</option>
            ${jobOptions}
          </select>
        </label>
        <div class="survivor-panel__traits">${traits}</div>
      </section>
      <section class="survivor-panel__section">
        <h4>Skills</h4>
        <ul class="survivor-panel__skills">${skills}</ul>
      </section>
      <section class="survivor-panel__section">
        <h4>Relationships</h4>
        <ul class="survivor-panel__relationships">${relationships || "<li>No notable bonds yet.</li>"}</ul>
        <div class="survivor-panel__actions">
          <button type="button" data-event="rested">Mark Rested</button>
          <button type="button" data-event="completed_mission">Mission Success</button>
          <button type="button" data-event="argument">Record Argument</button>
        </div>
      </section>
    `;

    const select = this.detail.querySelector("select");
    select?.addEventListener("change", event => {
      const value = (event.target as HTMLSelectElement).value;
      this.options.onAssignJob(survivor.id, value || null);
    });

    const buttons = Array.from(this.detail.querySelectorAll<HTMLButtonElement>('[data-event]'));
    buttons.forEach(button => {
      button.addEventListener("click", () => {
        const event = button.dataset.event;
        if (event) {
          this.options.onMoraleEvent(survivor.id, event);
        }
      });
    });
  }

  private getJobName(jobId: string): string {
    return this.jobs.find(job => job.id === jobId)?.name ?? jobId;
  }

  private resolveName(id: string): string {
    return this.roster.find(s => s.id === id)?.name ?? id;
  }

  private focusSelected(): void {
    if (!this.selectedId) {
      return;
    }
    const element = this.list.querySelector<HTMLElement>(".survivor-panel__item.is-selected");
    element?.focus();
  }
}
