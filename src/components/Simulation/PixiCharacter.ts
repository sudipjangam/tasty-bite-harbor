/**
 * PixiCharacter.ts
 * Wraps a PixiJS Container to represent a simulation character.
 * Handles smooth movement interpolation and sprite-based rendering
 * with procedural fallback when sprite sheets aren't available.
 */
import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { Point } from './rpgUtils';
import { hasTextures, getTexture, getSubTexture } from './spriteLoader';

const CHAR_SPEED = 1.5; // pixels per frame at 60fps

// ── Color sets for customers ────────────────────────────────────

const CUSTOMER_PALETTES = [
  { shirt: 0xe74c3c, pants: 0x2c3e50, hair: 0x2c1810 },
  { shirt: 0x3498db, pants: 0x34495e, hair: 0x5a3a20 },
  { shirt: 0x2ecc71, pants: 0x2c3e50, hair: 0x1a0e08 },
  { shirt: 0xf39c12, pants: 0x7f8c8d, hair: 0x8b4513 },
  { shirt: 0x9b59b6, pants: 0x2c3e50, hair: 0x3b2a1a },
  { shirt: 0x1abc9c, pants: 0x34495e, hair: 0xd4a574 },
];

export class PixiCharacter {
  container: Container;
  role: string;
  state: string = 'idle';

  // Grid position (logical)
  gridPos: Point;
  // Screen position (smoothly interpolated)
  screenX: number = 0;
  screenY: number = 0;
  // Target screen position
  targetScreenX: number = 0;
  targetScreenY: number = 0;

  private gfx: Graphics;
  private label: Text;
  private tileSize: number;
  private paletteIndex: number;
  private animFrame: number = 0;
  private animTimer: number = 0;
  private sprite: Sprite | null = null;
  private row: number = 2;

  constructor(id: string, role: string, startPos: Point, tileSize: number) {
    this.role = role;
    this.gridPos = { ...startPos };
    this.tileSize = tileSize;
    this.paletteIndex = Math.abs(hashCode(id)) % CUSTOMER_PALETTES.length;

    this.container = new Container();
    this.container.sortableChildren = true;

    this.gfx = new Graphics();
    this.container.addChild(this.gfx);

    if (hasTextures()) {
      this.sprite = new Sprite();
      this.sprite.anchor.set(0.5, 0.85); // Anchor near bottom center (feet)
      this.container.addChild(this.sprite);
    }

    // Determine row based on role
    if (this.role === 'chef') this.row = 0;
    else if (this.role === 'waiter') this.row = 1;
    else if (this.role === 'customer') {
      this.row = 2 + (this.paletteIndex % 3);
    }

    this.label = new Text({
      text: '',
      style: new TextStyle({
        fontSize: 8,
        fontFamily: 'monospace',
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 },
      }),
    });
    this.label.anchor.set(0.5, 1);
    this.label.y = -30;
    this.container.addChild(this.label);

    this.screenX = startPos.x * tileSize + tileSize / 2;
    this.screenY = startPos.y * tileSize + tileSize / 2;
    this.targetScreenX = this.screenX;
    this.targetScreenY = this.screenY;
  }

  /**
   * Update target position from simulation EventBus character data.
   */
  syncFromSim(gridX: number, gridY: number, state: string) {
    this.gridPos = { x: gridX, y: gridY };
    this.state = state;
    this.targetScreenX = gridX * this.tileSize + this.tileSize / 2;
    this.targetScreenY = gridY * this.tileSize + this.tileSize / 2;
  }

  /**
   * Called each PixiJS ticker frame. Interpolates position smoothly.
   */
  update(dt: number) {
    // Smooth movement
    const dx = this.targetScreenX - this.screenX;
    const dy = this.targetScreenY - this.screenY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      const speed = CHAR_SPEED * dt;
      if (dist <= speed) {
        this.screenX = this.targetScreenX;
        this.screenY = this.targetScreenY;
      } else {
        this.screenX += (dx / dist) * speed;
        this.screenY += (dy / dist) * speed;
      }
    }

    // Animation timer
    this.animTimer += dt;
    if (this.animTimer > 10) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // Update container position
    this.container.x = this.screenX;
    this.container.y = this.screenY;
    // Y-sort: higher zIndex = rendered on top (closer to camera)
    this.container.zIndex = Math.floor(this.screenY);

    // Redraw procedural sprite or update texture
    if (this.sprite && hasTextures()) {
      this.gfx.visible = false;
      this.sprite.visible = true;

      const base = getTexture('characters');
      if (base) {
        const frameW = base.width / 4;
        const frameH = base.height / 5;

        const isMoving = this.state.startsWith('walk') || dist > 1;
        const facingBack = (this.targetScreenY < this.screenY - 1) || this.state === 'cook'; // Cooks usually face up towards the stove
        
        let col = facingBack ? 2 : 0;
        if (isMoving && (this.animFrame % 2 === 1)) {
          col += 1;
        }

        const tex = getSubTexture('characters', col * frameW, this.row * frameH, frameW, frameH);
        if (tex) {
          this.sprite.texture = tex;
          // Scale to roughly fit a tile
          const scale = (this.tileSize * 1.5) / frameH;
          this.sprite.scale.set(scale);
        }
      }
    } else {
      if (this.sprite) this.sprite.visible = false;
      this.gfx.visible = true;
      this.drawProcedural();
    }
  }

  private drawProcedural() {
    const g = this.gfx;
    g.clear();

    let hairColor = 0x3b2a1a;
    let shirtColor = 0x4a86e8;
    let pantsColor = 0x2c3e50;
    const skinColor = 0xf5c9a0;
    let drawHat = false;
    let drawApron = false;

    if (this.role === 'chef') {
      shirtColor = 0xffffff;
      pantsColor = 0x333333;
      drawHat = true;
    } else if (this.role === 'waiter') {
      shirtColor = 0x1a1a2e;
      pantsColor = 0x1a1a2e;
      drawApron = true;
    } else if (this.role === 'customer') {
      const p = CUSTOMER_PALETTES[this.paletteIndex];
      shirtColor = p.shirt;
      pantsColor = p.pants;
      hairColor = p.hair;
    }

    // Walking bob
    const isMoving = this.state.startsWith('walk') || 
      Math.abs(this.targetScreenX - this.screenX) > 1 || 
      Math.abs(this.targetScreenY - this.screenY) > 1;
    const bob = isMoving ? Math.sin(this.animFrame * Math.PI / 2) * 1.5 : 0;

    // Shadow
    g.ellipse(0, 0, 8, 3);
    g.fill({ color: 0x000000, alpha: 0.15 });

    // Legs
    g.rect(-4, -10 + bob, 3, 8);
    g.rect(1, -10 - bob, 3, 8);
    g.fill({ color: pantsColor });

    // Shoes
    g.rect(-5, -3, 4, 3);
    g.rect(1, -3, 4, 3);
    g.fill({ color: 0x1a1a1a });

    // Body
    g.roundRect(-6, -20, 12, 11, 2);
    g.fill({ color: shirtColor });

    // Arms
    g.rect(-9, -19, 3, 8);
    g.rect(6, -19, 3, 8);
    g.fill({ color: shirtColor });

    // Hands
    g.rect(-9, -11, 3, 3);
    g.rect(6, -11, 3, 3);
    g.fill({ color: skinColor });

    // Apron
    if (drawApron) {
      g.rect(-5, -16, 10, 7);
      g.fill({ color: 0xffffff });
    }

    // Head
    g.rect(-5, -30, 10, 10);
    g.fill({ color: skinColor });

    // Hair
    g.rect(-6, -32, 12, 5);
    g.rect(-6, -32, 3, 8);
    g.fill({ color: hairColor });

    // Eyes
    g.rect(-3, -26, 2, 2);
    g.rect(1, -26, 2, 2);
    g.fill({ color: 0x000000 });

    // Chef hat
    if (drawHat) {
      g.rect(-6, -38, 12, 8);
      g.rect(-4, -42, 8, 5);
      g.fill({ color: 0xffffff });
      g.rect(-6, -32, 12, 2);
      g.fill({ color: 0xe0e0e0 });
    }

    // Carrying tray
    if (this.state === 'carry_tray') {
      g.rect(8, -18, 14, 2);
      g.fill({ color: 0xb0b0b0 });
      g.circle(15, -20, 4);
      g.fill({ color: 0xffffff });
      g.circle(15, -21, 2);
      g.fill({ color: 0xe74c3c });
    }

    // Cooking
    if (this.state === 'cook') {
      g.rect(8, -16, 2, 10);
      g.fill({ color: 0x888888 });
      g.rect(7, -18, 4, 3);
      g.fill({ color: 0x666666 });
    }
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
