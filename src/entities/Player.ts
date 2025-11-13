import { InputManager } from "../engine/Input";
import { World } from "../worldgen/World";
import { Inventory } from "../inventory/Inventory";

const BASE_SPEED = 150; // units per second

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
  private crouching = false;
  private sprinting = false;
  private movementLocked = false;

  constructor({ x, y }: PlayerOptions) {
    this.position = { x, y };
  }

  update(deltaTime: number, input: InputManager, world: World): void {
    if (this.movementLocked) {
      this.movementIntensity = 0;
      return;
    }
    const velocity: Vector2 = { x: 0, y: 0 };
    if (input.isKeyPressed("w")) velocity.y -= 1;
    if (input.isKeyPressed("s")) velocity.y += 1;
    if (input.isKeyPressed("a")) velocity.x -= 1;
    if (input.isKeyPressed("d")) velocity.x += 1;

    this.crouching = input.isKeyPressed("control");
    this.sprinting = !this.crouching && input.isKeyPressed("shift");
    const speedMultiplier = this.crouching ? 0.5 : this.sprinting ? 1.35 : 1;
    const moveSpeed = BASE_SPEED * speedMultiplier;

    const length = Math.hypot(velocity.x, velocity.y);
    if (length > 0) {
      velocity.x /= length;
      velocity.y /= length;
      this.direction = { ...velocity };
    }

    this.movementIntensity = length * speedMultiplier;

    const nextPosition = {
      x: this.position.x + velocity.x * moveSpeed * deltaTime,
      y: this.position.y + velocity.y * moveSpeed * deltaTime
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

  getStance(): "crouch" | "walk" | "sprint" {
    if (this.crouching) return "crouch";
    if (this.sprinting) return "sprint";
    return "walk";
  }

  lockMovement(): void {
    this.movementLocked = true;
    this.movementIntensity = 0;
  }

  unlockMovement(): void {
    this.movementLocked = false;
  }

  syncToVehicle(position: Vector2): void {
    this.position = { ...position };
  }
}
