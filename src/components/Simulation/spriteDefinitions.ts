// src/components/Simulation/spriteDefinitions.ts

export type CharacterRole = 'waiter' | 'chef' | 'manager' | 'customer' | 'staff';

export type SpriteState = 'idle' | 'walk_n' | 'walk_s' | 'walk_e' | 'walk_w' | 'carry_tray' | 'cook' | 'sit';

export interface SpriteConfig {
  role: CharacterRole;
  colors: {
    primary: string;   // Shirt/uniform top
    secondary: string; // Pants/skirt
    skin: string;
    hair: string;
    accent: string;    // Apron, tie, etc.
  };
  customImage?: HTMLImageElement | null;
}

// Varied customer color sets for visual diversity
const CUSTOMER_PALETTES = [
  { primary: '#e74c3c', secondary: '#2c3e50', hair: '#2c1810', accent: '#e74c3c' },
  { primary: '#3498db', secondary: '#1a252f', hair: '#5d4037', accent: '#3498db' },
  { primary: '#9b59b6', secondary: '#1c0a2e', hair: '#1a237e', accent: '#9b59b6' },
  { primary: '#27ae60', secondary: '#1a3326', hair: '#212121', accent: '#27ae60' },
  { primary: '#f39c12', secondary: '#1a0a00', hair: '#4a148c', accent: '#f39c12' },
];

export const defaultSpriteConfigs: Record<CharacterRole, SpriteConfig> = {
  waiter: {
    role: 'waiter',
    colors: {
      primary: '#111827',
      secondary: '#374151',
      skin: '#fcd34d',
      hair: '#1a0a00',
      accent: '#ffffff',
    },
  },
  chef: {
    role: 'chef',
    colors: {
      primary: '#ffffff',
      secondary: '#d1d5db',
      skin: '#fcd34d',
      hair: '#1a0a00',
      accent: '#e5e7eb',
    },
  },
  manager: {
    role: 'manager',
    colors: {
      primary: '#1e40af',
      secondary: '#1e3a8a',
      skin: '#fcd34d',
      hair: '#1a0a00',
      accent: '#93c5fd',
    },
  },
  staff: {
    role: 'staff',
    colors: {
      primary: '#374151',
      secondary: '#1f2937',
      skin: '#fcd34d',
      hair: '#1a0a00',
      accent: '#6b7280',
    },
  },
  customer: {
    role: 'customer',
    colors: {
      primary: '#ef4444',
      secondary: '#374151',
      skin: '#fcd34d',
      hair: '#1a0a00',
      accent: '#ef4444',
    },
  },
};

// Returns a deterministic customer palette based on their id
export function getCustomerConfig(id: string): SpriteConfig {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pal = CUSTOMER_PALETTES[hash % CUSTOMER_PALETTES.length];
  const skinOptions = ['#fcd34d', '#f5cba7', '#d4a57a', '#c68642', '#8d5524'];
  return {
    role: 'customer',
    colors: {
      primary: pal.primary,
      secondary: pal.secondary,
      skin: skinOptions[hash % skinOptions.length],
      hair: pal.hair,
      accent: pal.accent,
    },
  };
}

/**
 * Detailed procedural character drawing for Canvas.
 * Supports custom sprite images (uploaded via settings).
 */
export function drawCharacterFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  config: SpriteConfig,
  state: SpriteState,
  frame: number
) {
  // Use custom image if available
  if (config.customImage) {
    try {
      const imgW = 24;
      const imgH = 32;
      ctx.drawImage(config.customImage, x - imgW / 2, y - imgH, imgW, imgH);
      return;
    } catch {
      // fall through to procedural
    }
  }

  const isWalking = state.startsWith('walk');
  const walkCycle = Math.sin(frame * Math.PI * 2) ; // -1 to 1
  const bounce = isWalking ? Math.abs(walkCycle) * 2 : 0;
  const legSwing = isWalking ? walkCycle * 4 : 0;
  const armSwing = isWalking ? -walkCycle * 3 : 0;

  ctx.save();
  ctx.translate(x, y - bounce);

  // ── Shadow ──
  ctx.beginPath();
  ctx.ellipse(0, 2 + bounce, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();

  if (state === 'sit') {
    _drawSitting(ctx, config, frame);
    ctx.restore();
    return;
  }

  // ── Legs ──
  if (state === 'cook') {
    // Standing still, spread legs slightly
    _drawLeg(ctx, -3, 5, -2, 13, config.colors.secondary);
    _drawLeg(ctx, 3, 5, 4, 13, config.colors.secondary);
  } else {
    _drawLeg(ctx, -3, 5, -3 + legSwing, 13, config.colors.secondary);
    _drawLeg(ctx, 3, 5, 3 - legSwing, 13, config.colors.secondary);
  }

  // ── Body / Torso ──
  ctx.beginPath();
  ctx.roundRect(-6, -10, 12, 16, [3, 3, 2, 2]);
  ctx.fillStyle = config.colors.primary;
  ctx.fill();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.stroke();

  // Collar/detail based on role
  if (config.role === 'waiter') {
    // White collar + bow tie
    ctx.beginPath();
    ctx.moveTo(-3, -10);
    ctx.lineTo(0, -7);
    ctx.lineTo(3, -10);
    ctx.fillStyle = config.colors.accent;
    ctx.fill();
    // Bow tie
    ctx.beginPath();
    ctx.ellipse(-2, -7, 2, 1.5, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#c0392b';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2, -7, 2, 1.5, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#c0392b';
    ctx.fill();
  } else if (config.role === 'chef') {
    // Apron line
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 6);
    ctx.strokeStyle = config.colors.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (config.role === 'manager') {
    // Tie
    ctx.beginPath();
    ctx.moveTo(-1, -9);
    ctx.lineTo(1, -9);
    ctx.lineTo(2, -2);
    ctx.lineTo(0, 1);
    ctx.lineTo(-2, -2);
    ctx.closePath();
    ctx.fillStyle = config.colors.accent;
    ctx.fill();
  }

  // ── Arms ──
  if (state === 'carry_tray') {
    // Right arm raised straight holding tray
    _drawArm(ctx, 6, -7, 14, -10, config.colors.primary);
    // Tray
    ctx.beginPath();
    ctx.ellipse(16, -11, 9, 4, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#b0bec5';
    ctx.fill();
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Food on tray
    ctx.beginPath();
    ctx.arc(14, -13, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(19, -13, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#f39c12';
    ctx.fill();
    // Left arm normal
    _drawArm(ctx, -6, -7, -9 + armSwing, -1, config.colors.primary);
  } else if (state === 'cook') {
    // Both arms forward/down holding spatula
    _drawArm(ctx, -6, -7, -10, -3, config.colors.primary);
    _drawArm(ctx, 6, -7, 10, -2, config.colors.primary);
    // Spatula
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(14, -8);
    ctx.strokeStyle = '#9e9e9e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(11, -11, 5, 3, 1);
    ctx.fillStyle = '#bdbdbd';
    ctx.fill();
  } else {
    _drawArm(ctx, -6, -7, -9 + armSwing, -1, config.colors.primary);
    _drawArm(ctx, 6, -7, 9 - armSwing, -1, config.colors.primary);
  }

  // ── Head ──
  ctx.beginPath();
  ctx.arc(0, -17, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = config.colors.skin;
  ctx.fill();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.stroke();

  // Eyes
  const eyeDir = state === 'walk_e' ? 1.5 : state === 'walk_w' ? -1.5 : 0;
  ctx.beginPath();
  ctx.arc(-2.5 + eyeDir, -17, 1.2, 0, Math.PI * 2);
  ctx.arc(2.5 + eyeDir, -17, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = '#1a0a00';
  ctx.fill();

  // Hair
  ctx.beginPath();
  ctx.arc(0, -22, 6.5, Math.PI, 0);
  ctx.fillStyle = config.colors.hair;
  ctx.fill();

  // ── Role headwear ──
  if (config.role === 'chef') {
    // Chef hat (toque)
    ctx.beginPath();
    ctx.roundRect(-5, -32, 10, 12, [5, 5, 0, 0]);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-6, -24, 12, 4, 2);
    ctx.fillStyle = '#f5f5f5';
    ctx.fill();
  }

  ctx.restore();
}

function _drawLeg(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.stroke();
  // Shoe
  ctx.beginPath();
  ctx.ellipse(x2, y2, 3, 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a0a00';
  ctx.fill();
}

function _drawArm(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function _drawSitting(
  ctx: CanvasRenderingContext2D,
  config: SpriteConfig,
  frame: number
) {
  // Sitting pose: legs horizontal forward, body upright
  // Legs bent 90 degrees
  ctx.beginPath();
  ctx.moveTo(-3, 5);
  ctx.lineTo(-3, 10);
  ctx.lineTo(-8, 10);
  ctx.strokeStyle = config.colors.secondary;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(3, 5);
  ctx.lineTo(3, 10);
  ctx.lineTo(8, 10);
  ctx.strokeStyle = config.colors.secondary;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.roundRect(-6, -10, 12, 16, [3, 3, 2, 2]);
  ctx.fillStyle = config.colors.primary;
  ctx.fill();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.stroke();

  // Arms resting
  ctx.beginPath();
  ctx.moveTo(-6, -4);
  ctx.lineTo(-9, 2);
  ctx.moveTo(6, -4);
  ctx.lineTo(9, 2);
  ctx.strokeStyle = config.colors.primary;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(0, -17, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = config.colors.skin;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Eyes (looking down at table)
  ctx.beginPath();
  ctx.arc(-2.5, -16, 1.2, 0, Math.PI * 2);
  ctx.arc(2.5, -16, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = '#1a0a00';
  ctx.fill();

  // Hair
  ctx.beginPath();
  ctx.arc(0, -22, 6.5, Math.PI, 0);
  ctx.fillStyle = config.colors.hair;
  ctx.fill();
}
