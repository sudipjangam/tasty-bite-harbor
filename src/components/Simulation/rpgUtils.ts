export const TILE_SIZE = 40;

export interface Point {
  x: number;
  y: number;
}

/**
 * Converts a grid coordinate (e.g. 2, 3) to screen pixel coordinates
 * in a 3/4 orthographic projection.
 * We add an offset to center the grid on the canvas.
 */
export function toScreen(
  gridX: number,
  gridY: number,
  offsetX: number,
  offsetY: number
): { screenX: number; screenY: number } {
  return {
    screenX: offsetX + gridX * TILE_SIZE,
    screenY: offsetY + gridY * TILE_SIZE,
  };
}

/**
 * Simple utility to determine facing direction based on movement vector.
 */
export function getFacingDirection(currentPos: Point, targetPos: Point): 'down' | 'up' | 'left' | 'right' {
  const dx = targetPos.x - currentPos.x;
  const dy = targetPos.y - currentPos.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else {
    // If dy is positive, we are moving down the screen (towards camera)
    return dy > 0 ? 'down' : 'up';
  }
}

/**
 * Moves a point towards a target by a set speed
 */
export function getNextStep(current: Point, target: Point, speed: number): Point {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist <= speed) {
    return { ...target };
  }
  
  return {
    x: current.x + (dx / dist) * speed,
    y: current.y + (dy / dist) * speed
  };
}
