import { InputManager } from "../engine/Input";
import { World } from "../worldgen/World";
import { Inventory } from "../inventory/Inventory";

const PLAYER_SPEED = 160; // units per second

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerOptions {
  x: number;
  y: number;
}

export class Player {
  readonly inventory = new Inventory();
  private readonly size = 24;
  private readonly color = "#4ade80";

  position: Vector2;
  direction: Vector2 = { x: 0, y: 1 };
  private movementIntensity = 0;

  constructor({ x, y }: PlayerOptions) {
    this.position = { x, y };
  }

  update(deltaTime: number, input: InputManager, world: World): void {
    const velocity: Vector2 = { x: 0, y: 0 };
    if (input.isKeyPressed("w")) velocity.y -= 1;
    if (input.isKeyPressed("s")) velocity.y += 1;
    if (input.isKeyPressed("a")) velocity.x -= 1;
    if (input.isKeyPressed("d")) velocity.x += 1;

    const length = Math.hypot(velocity.x, velocity.y);
    if (length > 0) {
      velocity.x /= length;
      velocity.y /= length;
      this.direction = { ...velocity };
    }

    this.movementIntensity = length;

    const nextPosition = {
      x: this.position.x + velocity.x * PLAYER_SPEED * deltaTime,
      y: this.position.y + velocity.y * PLAYER_SPEED * deltaTime
    };

    this.position = world.constrainToWorld(nextPosition, this.size);
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(-4, -this.size / 2 - 6, 8, 6);
    ctx.restore();
  }

  getMovementIntensity(): number {
    return this.movementIntensity;
  }
}
