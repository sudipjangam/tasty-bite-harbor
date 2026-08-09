export const TILE_W = 64;
export const TILE_H = 32;

export interface Point {
  x: number;
  y: number;
}

export interface IsoPoint {
  screenX: number;
  screenY: number;
}

/**
 * Converts a 2D grid coordinate to an isometric screen coordinate.
 * @param gridX The x position on the grid (0 to cols)
 * @param gridY The y position on the grid (0 to rows)
 * @param offsetX The screen X offset to center the grid
 * @param offsetY The screen Y offset to center the grid
 */
export function toIsometric(gridX: number, gridY: number, offsetX: number, offsetY: number): IsoPoint {
  return {
    screenX: (gridX - gridY) * (TILE_W / 2) + offsetX,
    screenY: (gridX + gridY) * (TILE_H / 2) + offsetY,
  };
}

/**
 * Converts an isometric screen coordinate back to a 2D grid coordinate.
 */
export function toGrid(screenX: number, screenY: number, offsetX: number, offsetY: number): Point {
  const x = screenX - offsetX;
  const y = screenY - offsetY;

  return {
    x: (x / (TILE_W / 2) + y / (TILE_H / 2)) / 2,
    y: (y / (TILE_H / 2) - x / (TILE_W / 2)) / 2,
  };
}

/**
 * Calculates distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Basic A* pathfinding (placeholder for simple movement)
 * Moves towards target directly if no obstacles.
 */
export function getNextStep(current: Point, target: Point, speed: number): Point {
  const dist = distance(current, target);
  if (dist <= speed) {
    return { ...target };
  }

  const dx = (target.x - current.x) / dist;
  const dy = (target.y - current.y) / dist;

  return {
    x: current.x + dx * speed,
    y: current.y + dy * speed,
  };
}
