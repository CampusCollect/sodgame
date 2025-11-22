import type { Vector2 } from "../entities/Player";
import type { ChunkPoi } from "../worldgen/Chunk";
import type { HudProgressionSummary } from "./Hud";

interface MapPanelData {
  position: Vector2;
  pois: ChunkPoi[];
  progression?: HudProgressionSummary | null;
}

interface PoiDisplayRow {
  id: string;
  label: string;
  distance: number;
  loot: string;
  alarm: string;
}

export class MapPanel {
  private readonly root: HTMLDivElement;
  private readonly summary: HTMLDivElement;
  private readonly poiList: HTMLUListElement;
  private readonly footer: HTMLParagraphElement;
  private isOpen = false;
  private data: MapPanelData | null = null;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "map-panel hidden";

    const header = document.createElement("div");
    header.className = "map-panel__header";
    header.innerHTML = "<strong>Regional Intel</strong><span>Track POIs, heat, and siege pressure.</span>";

    this.summary = document.createElement("div");
    this.summary.className = "map-panel__summary";

    this.poiList = document.createElement("ul");
    this.poiList.className = "map-panel__pois";

    this.footer = document.createElement("p");
    this.footer.className = "map-panel__footer";

    this.root.append(header, this.summary, this.poiList, this.footer);
  }

  getElement(): HTMLDivElement {
    return this.root;
  }

  open(): void {
    this.isOpen = true;
    this.render();
  }

  close(): void {
    this.isOpen = false;
  }

  setData(data: MapPanelData): void {
    this.data = data;
    if (this.isOpen) {
      this.render();
    }
  }

  private render(): void {
    if (!this.data) {
      this.summary.innerText = "Scanning...";
      this.poiList.replaceChildren();
      this.footer.innerText = "Move into a biome to populate intel.";
      return;
    }
    const { position, pois, progression } = this.data;
    const heat = progression ? `${progression.baseHeat}%` : "--";
    const ring = progression ? progression.ring : "--";
    const siege = progression?.nextSiegeThreshold ? `${progression.nextSiegeThreshold}%` : "--";
    const season = progression ? `${progression.season} (${progression.seasonEffects.join("/ ") || "None"})` : "Unknown";
    this.summary.innerText = `Pos (${position.x.toFixed(0)}, ${position.y.toFixed(0)}) • Ring ${ring} • Heat ${heat} • Next Siege ${siege} • Season ${season}`;

    const rows = this.prepareRows(pois, position).slice(0, 8);
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "map-panel__poi map-panel__poi--empty";
      empty.innerText = "No points of interest detected in this sector.";
      this.poiList.replaceChildren(empty);
    } else {
      this.poiList.replaceChildren(
        ...rows.map(row => {
          const item = document.createElement("li");
          item.className = "map-panel__poi";
          item.innerHTML = `
            <div>
              <strong>${row.label}</strong>
              <span>${row.distance.toFixed(0)}m • Loot: ${row.loot}</span>
            </div>
            <code>${row.alarm}</code>
          `;
          return item;
        })
      );
    }

    this.footer.innerText = "Unlock more intel by building radio towers or scouting far rings.";
  }

  private prepareRows(pois: ChunkPoi[], position: Vector2): PoiDisplayRow[] {
    return pois
      .map(poi => {
        const dx = poi.worldPosition.x - position.x;
        const dy = poi.worldPosition.y - position.y;
        const distance = Math.hypot(dx, dy);
        return {
          id: poi.id,
          label: poi.name,
          distance,
          loot: poi.lootTable,
          alarm: poi.alarm === "active" ? "Alarmed" : "Silent"
        } satisfies PoiDisplayRow;
      })
      .sort((a, b) => a.distance - b.distance);
  }
}
