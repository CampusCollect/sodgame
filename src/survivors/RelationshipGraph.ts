export class RelationshipGraph {
  private readonly relationships = new Map<string, number>();

  private key(a: string, b: string): string {
    return [a, b].sort().join(":");
  }

  get(a: string, b: string): number {
    if (a === b) return 100;
    return this.relationships.get(this.key(a, b)) ?? 0;
  }

  set(a: string, b: string, value: number): void {
    if (a === b) return;
    const clamped = Math.max(-100, Math.min(100, Math.round(value)));
    this.relationships.set(this.key(a, b), clamped);
  }

  adjust(a: string, b: string, delta: number): number {
    const current = this.get(a, b);
    const next = current + delta;
    this.set(a, b, next);
    return this.get(a, b);
  }

  snapshot(): { pair: [string, string]; value: number }[] {
    return Array.from(this.relationships.entries()).map(([key, value]) => {
      const [a, b] = key.split(":");
      return { pair: [a, b], value };
    });
  }
}
