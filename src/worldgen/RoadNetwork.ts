import type { Vector2 } from "../entities/Player";
import { TILE_SIZE, type ChunkPoi } from "./Chunk";

interface RoadNode {
  id: string;
  chunkId: string;
  position: Vector2;
  category: string;
}

interface RoadEdge {
  id: string;
  from: string;
  to: string;
  bend: Vector2;
}

interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function distanceSq(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export class RoadNetwork {
  private readonly nodes = new Map<string, RoadNode>();
  private readonly chunkToNodes = new Map<string, string[]>();
  private readonly edges = new Map<string, RoadEdge>();

  registerChunk(chunkId: string, pois: ChunkPoi[]): void {
    const nodeIds: string[] = [];
    for (const poi of pois) {
      if (!poi.isMajor) continue;
      const center = this.centerOf(poi);
      const nodeId = `${chunkId}:${poi.id}`;
      const node: RoadNode = { id: nodeId, chunkId, position: center, category: poi.category };
      this.nodes.set(nodeId, node);
      nodeIds.push(nodeId);
      this.connectNode(node);
    }

    if (nodeIds.length > 0) {
      this.chunkToNodes.set(chunkId, nodeIds);
    }
  }

  removeChunk(chunkId: string): void {
    const nodeIds = this.chunkToNodes.get(chunkId);
    if (!nodeIds) return;

    for (const nodeId of nodeIds) {
      this.nodes.delete(nodeId);
      for (const key of Array.from(this.edges.keys())) {
        const edge = this.edges.get(key);
        if (edge && (edge.from === nodeId || edge.to === nodeId)) {
          this.edges.delete(key);
        }
      }
    }

    this.chunkToNodes.delete(chunkId);
  }

  draw(ctx: CanvasRenderingContext2D, offset: Vector2, viewport: { width: number; height: number }): void {
    const viewRect: ViewRect = {
      x: offset.x - 300,
      y: offset.y - 300,
      w: viewport.width + 600,
      h: viewport.height + 600
    };

    ctx.save();
    ctx.strokeStyle = "rgba(248, 250, 252, 0.35)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    for (const edge of this.edges.values()) {
      const from = this.nodes.get(edge.from);
      const to = this.nodes.get(edge.to);
      if (!from || !to) continue;
      if (!this.edgeIntersectsView(from.position, to.position, viewRect)) continue;

      ctx.beginPath();
      ctx.moveTo(from.position.x - offset.x, from.position.y - offset.y);
      ctx.quadraticCurveTo(
        edge.bend.x - offset.x,
        edge.bend.y - offset.y,
        to.position.x - offset.x,
        to.position.y - offset.y
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  private connectNode(node: RoadNode): void {
    const neighbors = [...this.nodes.values()].filter((n) => n.id !== node.id);
    neighbors.sort((a, b) => distanceSq(a.position, node.position) - distanceSq(b.position, node.position));
    const targets = neighbors.slice(0, 3);

    for (const target of targets) {
      const key = edgeKey(node.id, target.id);
      if (this.edges.has(key)) continue;
      this.edges.set(key, {
        id: key,
        from: node.id,
        to: target.id,
        bend: this.computeBend(node.position, target.position)
      });
    }
  }

  private centerOf(poi: ChunkPoi): Vector2 {
    return {
      x: poi.worldPosition.x + (poi.size[0] * 0.5) * TILE_SIZE,
      y: poi.worldPosition.y + (poi.size[1] * 0.5) * TILE_SIZE
    };
  }

  private edgeIntersectsView(a: Vector2, b: Vector2, view: ViewRect): boolean {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const intersectsX = maxX >= view.x && minX <= view.x + view.w;
    const intersectsY = maxY >= view.y && minY <= view.y + view.h;
    return intersectsX && intersectsY;
  }

  private computeBend(a: Vector2, b: Vector2): Vector2 {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const bendMagnitude = Math.min(200, length * 0.25);
    const hash = Math.sin((a.x + b.x) * 0.001 + (a.y + b.y) * 0.001);
    const offset = bendMagnitude * hash;
    return { x: mid.x + nx * offset, y: mid.y + ny * offset };
  }
}
