import { Point, getNextStep } from './isometricUtils';
import { CharacterRole, SpriteState, SpriteConfig, defaultSpriteConfigs, getCustomerConfig, drawCharacterFallback } from './spriteDefinitions';

export class SimulationCharacter {
  id: string;
  role: CharacterRole;
  config: SpriteConfig;
  
  // Grid coordinates
  position: Point;
  targetPosition: Point | null = null;
  
  // State
  state: SpriteState = 'idle';
  speed: number = 0.05; // Grid cells per frame
  animationFrame: number = 0;
  
  // Assigned tasks
  assignedTableId: string | null = null;

  constructor(id: string, role: CharacterRole, startPosition: Point, config?: SpriteConfig) {
    this.id = id;
    this.role = role;
    this.position = { ...startPosition };
    // Customers get a unique appearance based on their ID
    this.config = config || (role === 'customer' ? getCustomerConfig(id) : defaultSpriteConfigs[role] || defaultSpriteConfigs['staff']);
  }

  setTarget(target: Point) {
    this.targetPosition = { ...target };
    this.updateStateBasedOnTarget();
  }

  updateStateBasedOnTarget() {
    if (!this.targetPosition) {
      this.state = 'idle';
      return;
    }
    
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    
    // Determine direction for isometric view
    // Isometric directions:
    // +x = SE, -x = NW, +y = SW, -y = NE
    if (Math.abs(dx) > Math.abs(dy)) {
      this.state = dx > 0 ? 'walk_e' : 'walk_w';
    } else {
      this.state = dy > 0 ? 'walk_s' : 'walk_n';
    }
  }

  update(deltaTime: number) {
    // Basic animation loop
    this.animationFrame = (Date.now() % 1000) / 1000;

    if (this.targetPosition) {
      this.position = getNextStep(this.position, this.targetPosition, this.speed);
      
      // Reached target
      if (this.position.x === this.targetPosition.x && this.position.y === this.targetPosition.y) {
        this.targetPosition = null;
        if (this.state.startsWith('walk')) {
          this.state = 'idle';
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, screenX: number, screenY: number) {
    drawCharacterFallback(ctx, screenX, screenY, this.config, this.state, this.animationFrame);
  }
}
