/**
 * rpgRenderer.ts — Pure top-down pixel-art style renderer
 * Inspired by "My Sushi Story" — warm wooden tones, detailed tiles, cozy restaurant feel.
 */
import { SimTable, SimLayoutObject } from './useSimulationData';
import { TILE_SIZE } from './rpgUtils';

// ── Palette ─────────────────────────────────────────────────────

export interface SimPalette {
  // Canvas background outside restaurant
  ambientBg: string;
  // Floor
  floorBase: string;
  floorAlt: string;   // alternating tile
  floorLine: string;
  // Walls
  wallOuter: string;
  wallInner: string;
  wallTrim: string;
  // Tables
  tableTop: string;
  tableTopOccupied: string;
  tableLeg: string;
  // Chairs / seats
  chairSeat: string;
  chairBack: string;
  // Kitchen
  kitchenFloor: string;
  counterTop: string;
  counterSide: string;
  stoveRing: string;
  // Text
  labelColor: string;
  labelBg: string;
  // Decor
  plantGreen: string;
  plantPot: string;
}

export const WARM_PALETTE: SimPalette = {
  ambientBg:       '#c9b896',   // warm parchment outside
  floorBase:       '#e8dcc8',   // light wood
  floorAlt:        '#ddd0b8',   // slightly darker alternate tile
  floorLine:       '#cfc0a4',
  wallOuter:       '#6b4c3b',   // dark wood outer wall
  wallInner:       '#8b6b52',   // inner wall face
  wallTrim:        '#a8845e',   // trim / crown moulding
  tableTop:        '#c4956a',   // wood table
  tableTopOccupied:'#b85c4a',   // reddish cloth on occupied
  tableLeg:        '#7a5a40',
  chairSeat:       '#a07850',
  chairBack:       '#7a5a40',
  kitchenFloor:    '#d6cbb0',
  counterTop:      '#e0ddd5',   // stainless / light counter
  counterSide:     '#b0ada5',
  stoveRing:       '#333333',
  labelColor:      '#3b2a1a',
  labelBg:         'rgba(255,248,230,0.85)',
  plantGreen:      '#5a9e4b',
  plantPot:        '#8b5e3c',
};

export const DARK_PALETTE: SimPalette = {
  ambientBg:       '#131820',
  floorBase:       '#232d3a',
  floorAlt:        '#1e2735',
  floorLine:       '#1a2230',
  wallOuter:       '#0f151e',
  wallInner:       '#1a2335',
  wallTrim:        '#2a3a52',
  tableTop:        '#3a4d65',
  tableTopOccupied:'#5a3040',
  tableLeg:        '#1e2a3a',
  chairSeat:       '#2e3d50',
  chairBack:       '#1e2a3a',
  kitchenFloor:    '#1e2a35',
  counterTop:      '#3a4555',
  counterSide:     '#2a3545',
  stoveRing:       '#555555',
  labelColor:      '#c0d0e0',
  labelBg:         'rgba(20,30,45,0.85)',
  plantGreen:      '#3a6a3a',
  plantPot:        '#2a3a2a',
};

// ── Helpers ─────────────────────────────────────────────────────

function px(gridX: number, gridY: number, ox: number, oy: number) {
  return { sx: ox + gridX * TILE_SIZE, sy: oy + gridY * TILE_SIZE };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// ── Floor ───────────────────────────────────────────────────────

export function drawFloor(
  ctx: CanvasRenderingContext2D,
  gridW: number,
  gridH: number,
  offsetX: number,
  offsetY: number,
  palette: SimPalette
) {
  const T = TILE_SIZE;

  // Draw each tile alternating for a warm checkerboard wood-plank look
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const isAlt = (gx + gy) % 2 === 0;
      ctx.fillStyle = isAlt ? palette.floorBase : palette.floorAlt;
      ctx.fillRect(offsetX + gx * T, offsetY + gy * T, T, T);

      // Subtle plank line across the middle of each tile (horizontal)
      ctx.strokeStyle = palette.floorLine;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(offsetX + gx * T, offsetY + gy * T + T / 2);
      ctx.lineTo(offsetX + gx * T + T, offsetY + gy * T + T / 2);
      ctx.stroke();
    }
  }

  // Grid border
  ctx.strokeStyle = palette.floorLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(offsetX, offsetY, gridW * T, gridH * T);
}

// ── Walls ───────────────────────────────────────────────────────

export function drawPerimeterWalls(
  ctx: CanvasRenderingContext2D,
  gridW: number,
  gridH: number,
  offsetX: number,
  offsetY: number,
  palette: SimPalette
) {
  const T = TILE_SIZE;
  const wallThick = T * 0.6;

  // ── Top wall ──
  ctx.fillStyle = palette.wallOuter;
  ctx.fillRect(offsetX - wallThick, offsetY - wallThick, gridW * T + wallThick * 2, wallThick);
  // inner face
  ctx.fillStyle = palette.wallInner;
  ctx.fillRect(offsetX, offsetY - wallThick * 0.4, gridW * T, wallThick * 0.4);
  // trim
  ctx.fillStyle = palette.wallTrim;
  ctx.fillRect(offsetX - wallThick, offsetY - wallThick, gridW * T + wallThick * 2, 4);

  // ── Left wall ──
  ctx.fillStyle = palette.wallOuter;
  ctx.fillRect(offsetX - wallThick, offsetY - wallThick, wallThick, gridH * T + wallThick * 2);
  ctx.fillStyle = palette.wallInner;
  ctx.fillRect(offsetX - wallThick * 0.4, offsetY, wallThick * 0.4, gridH * T);

  // ── Right wall ──
  ctx.fillStyle = palette.wallOuter;
  ctx.fillRect(offsetX + gridW * T, offsetY - wallThick, wallThick, gridH * T + wallThick * 2);
  ctx.fillStyle = palette.wallInner;
  ctx.fillRect(offsetX + gridW * T, offsetY, wallThick * 0.4, gridH * T);

  // ── Bottom wall ──
  ctx.fillStyle = palette.wallOuter;
  ctx.fillRect(offsetX - wallThick, offsetY + gridH * T, gridW * T + wallThick * 2, wallThick);
  ctx.fillStyle = palette.wallInner;
  ctx.fillRect(offsetX, offsetY + gridH * T, gridW * T, wallThick * 0.4);

  // ── Door opening (bottom center) ──
  const doorW = T * 3;
  const doorX = offsetX + (gridW * T - doorW) / 2;
  ctx.fillStyle = palette.floorBase;
  ctx.fillRect(doorX, offsetY + gridH * T, doorW, wallThick);
  // door mat
  ctx.fillStyle = '#8b6040';
  ctx.fillRect(doorX + 8, offsetY + gridH * T + 4, doorW - 16, wallThick - 8);

  // ── Corner decorative plants ──
  drawPlant(ctx, offsetX + 6, offsetY + 6, palette);
  drawPlant(ctx, offsetX + gridW * T - 22, offsetY + 6, palette);
  drawPlant(ctx, offsetX + 6, offsetY + gridH * T - 22, palette);
  drawPlant(ctx, offsetX + gridW * T - 22, offsetY + gridH * T - 22, palette);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, palette: SimPalette) {
  // Pot
  ctx.fillStyle = palette.plantPot;
  ctx.fillRect(x + 2, y + 10, 12, 8);
  ctx.fillRect(x, y + 8, 16, 3);
  // Leaves
  ctx.fillStyle = palette.plantGreen;
  ctx.beginPath();
  ctx.arc(x + 8, y + 6, 8, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = '#7ac060';
  ctx.beginPath();
  ctx.arc(x + 6, y + 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ── Tables ──────────────────────────────────────────────────────

export function drawDetailedTable(
  ctx: CanvasRenderingContext2D,
  table: SimTable,
  offsetX: number,
  offsetY: number,
  palette: SimPalette,
  animFrame: number
) {
  const T = TILE_SIZE;
  const { sx, sy } = px(table.x_pos, table.y_pos, offsetX, offsetY);
  const tw = table.width * T;
  const th = table.height * T;
  const cx = sx + tw / 2;
  const cy = sy + th / 2;
  const isOccupied = table.status === 'occupied';
  const isReserved = table.status === 'reserved';

  // ── Chairs ──
  const capacity = table.capacity || 4;
  const chairSize = Math.min(T * 0.35, 14);
  const chairPad = 4;

  ctx.fillStyle = palette.chairBack;
  // Top chairs
  const topCount = Math.ceil(capacity / 4);
  for (let i = 0; i < topCount; i++) {
    const chairX = cx - (topCount * (chairSize + 4)) / 2 + i * (chairSize + 4);
    ctx.fillRect(chairX, sy - chairSize - chairPad, chairSize, chairSize);
    // seat highlight
    ctx.fillStyle = palette.chairSeat;
    ctx.fillRect(chairX + 2, sy - chairSize - chairPad + 2, chairSize - 4, chairSize - 4);
    ctx.fillStyle = palette.chairBack;
  }
  // Bottom chairs
  const botCount = Math.ceil(capacity / 4);
  for (let i = 0; i < botCount; i++) {
    const chairX = cx - (botCount * (chairSize + 4)) / 2 + i * (chairSize + 4);
    ctx.fillRect(chairX, sy + th + chairPad, chairSize, chairSize);
    ctx.fillStyle = palette.chairSeat;
    ctx.fillRect(chairX + 2, sy + th + chairPad + 2, chairSize - 4, chairSize - 4);
    ctx.fillStyle = palette.chairBack;
  }
  // Left chairs
  const leftCount = Math.floor(capacity / 4) || 1;
  for (let i = 0; i < leftCount; i++) {
    const chairY = cy - (leftCount * (chairSize + 4)) / 2 + i * (chairSize + 4);
    ctx.fillRect(sx - chairSize - chairPad, chairY, chairSize, chairSize);
    ctx.fillStyle = palette.chairSeat;
    ctx.fillRect(sx - chairSize - chairPad + 2, chairY + 2, chairSize - 4, chairSize - 4);
    ctx.fillStyle = palette.chairBack;
  }
  // Right chairs
  const rightCount = Math.floor(capacity / 4) || 1;
  for (let i = 0; i < rightCount; i++) {
    const chairY = cy - (rightCount * (chairSize + 4)) / 2 + i * (chairSize + 4);
    ctx.fillRect(sx + tw + chairPad, chairY, chairSize, chairSize);
    ctx.fillStyle = palette.chairSeat;
    ctx.fillRect(sx + tw + chairPad + 2, chairY + 2, chairSize - 4, chairSize - 4);
    ctx.fillStyle = palette.chairBack;
  }

  // ── Table surface ──
  ctx.fillStyle = isOccupied ? palette.tableTopOccupied : palette.tableTop;
  drawRoundedRect(ctx, sx + 4, sy + 4, tw - 8, th - 8, 4);

  // Table edge / border
  ctx.strokeStyle = palette.tableLeg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(sx + 4, sy + 4, tw - 8, th - 8, 4);
  ctx.stroke();

  // ── Table details ──
  if (isOccupied) {
    // Draw plates with food
    const plateR = Math.min(tw, th) * 0.12;
    // Plate 1
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - tw * 0.15, cy - th * 0.1, plateR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e65c3a';
    ctx.beginPath();
    ctx.arc(cx - tw * 0.15, cy - th * 0.1, plateR * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Plate 2
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + tw * 0.15, cy + th * 0.05, plateR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4a843';
    ctx.beginPath();
    ctx.arc(cx + tw * 0.15, cy + th * 0.05, plateR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Steam wisps
    const t = animFrame * Math.PI * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let s = 0; s < 3; s++) {
      const steamX = cx - 8 + s * 8 + Math.sin(t + s) * 2;
      const steamY = cy - th * 0.3 - s * 4 + Math.cos(t + s * 0.7) * 2;
      ctx.beginPath();
      ctx.arc(steamX, steamY, 2 - s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (isReserved) {
    // Reserved sign
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RSVD', cx, cy);
  } else {
    // Empty table — napkin / centerpiece
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
  }

  // ── Table name label ──
  ctx.fillStyle = palette.labelBg;
  const labelW = ctx.measureText(table.name).width + 8;
  drawRoundedRect(ctx, cx - labelW / 2, sy - 14, labelW, 12, 3);
  ctx.fillStyle = palette.labelColor;
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(table.name, cx, sy - 8);

  // ── Status dot ──
  const dotColor = isOccupied ? '#ef4444' : isReserved ? '#3b82f6' : '#22c55e';
  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(sx + tw - 8, sy + 8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ── Layout Objects ──────────────────────────────────────────────

export function drawLayoutObject(
  ctx: CanvasRenderingContext2D,
  obj: SimLayoutObject,
  offsetX: number,
  offsetY: number,
  palette: SimPalette,
  animFrame: number,
  isCooking: boolean
) {
  const T = TILE_SIZE;
  const { sx, sy } = px(obj.x_pos, obj.y_pos, offsetX, offsetY);
  const ow = obj.width * T;
  const oh = obj.height * T;

  if (obj.type === 'kitchen') {
    drawKitchen(ctx, sx, sy, ow, oh, palette, animFrame, isCooking);
  } else if (obj.type === 'bar') {
    drawBar(ctx, sx, sy, ow, oh, palette);
  } else if (obj.type === 'counter') {
    drawCounter(ctx, sx, sy, ow, oh, palette);
  } else if (obj.type === 'host_stand') {
    drawHostStand(ctx, sx, sy, ow, oh, palette);
  } else if (obj.type === 'restroom') {
    drawGenericRoom(ctx, sx, sy, ow, oh, palette, '🚻', obj.name);
  } else if (obj.type === 'storage') {
    drawGenericRoom(ctx, sx, sy, ow, oh, palette, '📦', obj.name);
  } else {
    drawGenericRoom(ctx, sx, sy, ow, oh, palette, '', obj.name);
  }
}

function drawKitchen(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  palette: SimPalette,
  animFrame: number,
  isCooking: boolean
) {
  // Kitchen floor
  ctx.fillStyle = palette.kitchenFloor;
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = palette.counterSide;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Counter along the top
  ctx.fillStyle = palette.counterTop;
  ctx.fillRect(x + 4, y + 4, w - 8, TILE_SIZE * 0.8);
  ctx.fillStyle = palette.counterSide;
  ctx.fillRect(x + 4, y + 4 + TILE_SIZE * 0.8, w - 8, 4);

  // Stove burners
  const burnerCount = Math.min(Math.floor((w - 20) / 30), 4);
  const burnerSpacing = (w - 20) / burnerCount;
  for (let i = 0; i < burnerCount; i++) {
    const bx = x + 10 + i * burnerSpacing + burnerSpacing / 2;
    const by = y + 4 + TILE_SIZE * 0.4;

    // Burner ring
    ctx.strokeStyle = palette.stoveRing;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Flame if cooking
    if (isCooking) {
      const flicker = Math.sin(animFrame * Math.PI * 2 + i) * 2;
      ctx.fillStyle = '#ff6b00';
      ctx.beginPath();
      ctx.arc(bx, by, 5 + flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(bx, by, 3 + flicker * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Prep table in center
  ctx.fillStyle = palette.counterTop;
  const prepW = w * 0.5;
  const prepH = h * 0.25;
  ctx.fillRect(x + (w - prepW) / 2, y + h * 0.5, prepW, prepH);
  ctx.strokeStyle = palette.counterSide;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + (w - prepW) / 2, y + h * 0.5, prepW, prepH);

  // Sink area bottom-right
  ctx.fillStyle = '#b8c8d8';
  ctx.fillRect(x + w - 35, y + h - 30, 25, 20);
  ctx.fillStyle = '#90a8c0';
  ctx.fillRect(x + w - 32, y + h - 27, 19, 14);

  // Label
  ctx.fillStyle = palette.labelBg;
  drawRoundedRect(ctx, x + w / 2 - 25, y + h - 16, 50, 13, 3);
  ctx.fillStyle = palette.labelColor;
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍳 Kitchen', x + w / 2, y + h - 10);
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  palette: SimPalette
) {
  // Bar counter
  ctx.fillStyle = palette.tableTop;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = palette.tableLeg;
  ctx.fillRect(x, y, w, 4);
  ctx.fillRect(x, y + h - 4, w, 4);

  // Bar stools along one side
  const stoolCount = Math.floor(h / (TILE_SIZE * 0.6));
  for (let i = 0; i < stoolCount; i++) {
    const stoolY = y + 10 + i * (h - 20) / Math.max(stoolCount - 1, 1);
    ctx.fillStyle = palette.chairBack;
    ctx.beginPath();
    ctx.arc(x - 10, stoolY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.chairSeat;
    ctx.beginPath();
    ctx.arc(x - 10, stoolY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bottles on bar
  const bottleColors = ['#c0392b', '#27ae60', '#f39c12', '#2980b9'];
  for (let i = 0; i < Math.min(4, Math.floor(w / 12)); i++) {
    ctx.fillStyle = bottleColors[i % bottleColors.length];
    ctx.fillRect(x + 6 + i * 12, y + 8, 4, 10);
    ctx.fillRect(x + 5 + i * 12, y + 8, 6, 3);
  }

  // Label
  ctx.fillStyle = palette.labelColor;
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Bar', x + w / 2, y + h / 2 + 3);
}

function drawCounter(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  palette: SimPalette
) {
  ctx.fillStyle = palette.counterTop;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = palette.counterSide;
  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.strokeStyle = palette.counterSide;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawHostStand(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  palette: SimPalette
) {
  // Small podium
  ctx.fillStyle = palette.tableTop;
  drawRoundedRect(ctx, x + 6, y + 6, w - 12, h - 12, 4);
  ctx.strokeStyle = palette.tableLeg;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 6, w - 12, h - 12, 4);
  ctx.stroke();

  // Menu book
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(x + w / 2 - 8, y + h / 2 - 5, 16, 10);
  ctx.fillStyle = '#ecf0f1';
  ctx.fillRect(x + w / 2 - 6, y + h / 2 - 3, 5, 6);
  ctx.fillRect(x + w / 2 + 1, y + h / 2 - 3, 5, 6);

  // Label
  ctx.fillStyle = palette.labelColor;
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Host', x + w / 2, y + h - 2);
}

function drawGenericRoom(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  palette: SimPalette,
  emoji: string,
  name: string
) {
  // Floor
  ctx.fillStyle = palette.kitchenFloor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = palette.counterSide;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Icon + label
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (emoji) {
    ctx.fillText(emoji, x + w / 2, y + h / 2 - 6);
  }
  ctx.fillStyle = palette.labelColor;
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText(name, x + w / 2, y + h / 2 + 10);
}

// ── Characters ──────────────────────────────────────────────────

export function drawCharacterRpg(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  role: string,
  state: string,
  customImage?: HTMLImageElement | null
) {
  const T = TILE_SIZE;
  const cx = screenX + T / 2;
  const baseY = screenY + T;  // feet position (bottom of tile)

  if (customImage) {
    const w = T * 0.8;
    const h = T * 1.2;
    ctx.drawImage(customImage, cx - w / 2, baseY - h, w, h);
    return;
  }

  // ── Pixel-art proportioned character (top-down, ~24px tall) ──

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 2, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Color palette per role
  let hairColor = '#3b2a1a';
  let shirtColor = '#4a86e8';
  let pantsColor = '#2c3e50';
  let skinColor  = '#f5c9a0';
  let hatColor   = '';
  let apronColor = '';

  if (role === 'chef') {
    shirtColor = '#ffffff';
    pantsColor = '#333333';
    hatColor = '#ffffff';
  } else if (role === 'waiter') {
    shirtColor = '#1a1a2e';
    pantsColor = '#1a1a2e';
    apronColor = '#ffffff';
  } else if (role === 'customer') {
    // Vary customer colors based on simple hash
    const colors = [
      { shirt: '#e74c3c', pants: '#2c3e50', hair: '#2c1810' },
      { shirt: '#3498db', pants: '#34495e', hair: '#5a3a20' },
      { shirt: '#2ecc71', pants: '#2c3e50', hair: '#1a0e08' },
      { shirt: '#f39c12', pants: '#7f8c8d', hair: '#8b4513' },
      { shirt: '#9b59b6', pants: '#2c3e50', hair: '#3b2a1a' },
      { shirt: '#1abc9c', pants: '#34495e', hair: '#d4a574' },
    ];
    const hash = screenX * 7 + screenY * 13;
    const c = colors[Math.abs(hash) % colors.length];
    shirtColor = c.shirt;
    pantsColor = c.pants;
    hairColor = c.hair;
  } else {
    // generic staff
    shirtColor = '#2980b9';
    pantsColor = '#2c3e50';
  }

  const headY = baseY - 24;

  // ── Legs / pants ──
  ctx.fillStyle = pantsColor;
  ctx.fillRect(cx - 4, baseY - 10, 3, 8);
  ctx.fillRect(cx + 1, baseY - 10, 3, 8);

  // ── Shoes ──
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(cx - 5, baseY - 3, 4, 3);
  ctx.fillRect(cx + 1, baseY - 3, 4, 3);

  // ── Body / shirt ──
  ctx.fillStyle = shirtColor;
  ctx.fillRect(cx - 6, baseY - 20, 12, 11);

  // ── Arms ──
  ctx.fillStyle = shirtColor;
  ctx.fillRect(cx - 9, baseY - 19, 3, 8);
  ctx.fillRect(cx + 6, baseY - 19, 3, 8);
  // Hands
  ctx.fillStyle = skinColor;
  ctx.fillRect(cx - 9, baseY - 11, 3, 3);
  ctx.fillRect(cx + 6, baseY - 11, 3, 3);

  // ── Apron (waiter) ──
  if (apronColor) {
    ctx.fillStyle = apronColor;
    ctx.fillRect(cx - 5, baseY - 16, 10, 7);
  }

  // ── Head ──
  ctx.fillStyle = skinColor;
  ctx.fillRect(cx - 5, headY, 10, 10);

  // ── Hair ──
  ctx.fillStyle = hairColor;
  ctx.fillRect(cx - 6, headY - 2, 12, 5);
  ctx.fillRect(cx - 6, headY - 2, 3, 8);

  // ── Eyes ──
  ctx.fillStyle = '#000000';
  ctx.fillRect(cx - 3, headY + 4, 2, 2);
  ctx.fillRect(cx + 1, headY + 4, 2, 2);

  // ── Chef hat ──
  if (hatColor) {
    ctx.fillStyle = hatColor;
    ctx.fillRect(cx - 6, headY - 8, 12, 8);
    ctx.fillRect(cx - 4, headY - 12, 8, 5);
    // hat band
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(cx - 6, headY - 2, 12, 2);
  }

  // ── Carrying tray ──
  if (state === 'carry_tray') {
    // Tray
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(cx + 8, baseY - 18, 14, 2);
    // Plate on tray
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + 15, baseY - 20, 4, 0, Math.PI * 2);
    ctx.fill();
    // Food
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(cx + 15, baseY - 21, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Cooking animation ──
  if (state === 'cook') {
    // Spatula
    ctx.fillStyle = '#888888';
    ctx.fillRect(cx + 8, baseY - 16, 2, 10);
    ctx.fillStyle = '#666666';
    ctx.fillRect(cx + 7, baseY - 18, 4, 3);
  }

  // ── Sitting ──
  if (state === 'sit') {
    // Already drawn, but make them slightly shorter/lower
    // This is handled by the base position being adjusted by the event bus
  }
}
