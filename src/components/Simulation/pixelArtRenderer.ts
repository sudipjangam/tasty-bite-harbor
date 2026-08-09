/**
 * pixelArtRenderer.ts
 * Procedural pixel-art style drawing helpers for the isometric restaurant simulation.
 * Supports two themes: "warm" (light mode — sushi restaurant style) and "dark" (dark mode).
 */

import { toIsometric } from './isometricUtils';
import type { SimTable, SimLayoutObject } from './useSimulationData';

// ─────────────────────────────────────────────────────────────
// THEME PALETTES
// ─────────────────────────────────────────────────────────────

export interface SimPalette {
  // Floor
  floorTileA: string;
  floorTileB: string;
  floorEdge: string;
  floorShadow: string;

  // Walls
  wallTop: string;
  wallSideLight: string;
  wallSideDark: string;
  wallBorder: string;

  // Tables
  tableTopAvail: string;
  tableTopOccupied: string;
  tableTopReserved: string;
  tableSideLight: string;
  tableSideDark: string;
  tableClothOccupied: string;

  // Chairs
  chairTop: string;
  chairSide: string;
  chairLeg: string;

  // Kitchen
  kitchenCounter: string;
  kitchenCounterSide: string;
  kitchenAppliance: string;
  kitchenFlame: string;

  // Bar
  barTop: string;
  barSide: string;

  // Generic object
  objectTop: string;
  objectSide: string;

  // Lighting
  lightGlow: string;
  ambientBg: string;

  // Text
  labelColor: string;
  statusColor: string;
}

export const WARM_PALETTE: SimPalette = {
  floorTileA: '#f5e6c8',
  floorTileB: '#e8d5a3',
  floorEdge: '#c9b87a',
  floorShadow: 'rgba(100, 70, 20, 0.15)',

  wallTop: '#d4c098',
  wallSideLight: '#e8d5a3',
  wallSideDark: '#b8a06a',
  wallBorder: '#8b6914',

  tableTopAvail: '#d4a85a',
  tableTopOccupied: '#c0392b',
  tableTopReserved: '#2980b9',
  tableSideLight: '#b8864a',
  tableSideDark: '#8b5e32',
  tableClothOccupied: '#e74c3c',

  chairTop: '#8b6914',
  chairSide: '#6b4f10',
  chairLeg: '#5a3f0a',

  kitchenCounter: '#d4c098',
  kitchenCounterSide: '#b8a06a',
  kitchenAppliance: '#7f8c8d',
  kitchenFlame: '#e67e22',

  barTop: '#6d4c41',
  barSide: '#4e342e',

  objectTop: '#bdc3c7',
  objectSide: '#95a5a6',

  lightGlow: 'rgba(255, 220, 100, 0.15)',
  ambientBg: '#fdf6e3',

  labelColor: '#2c1810',
  statusColor: '#1a0a00',
};

export const DARK_PALETTE: SimPalette = {
  floorTileA: '#1a2744',
  floorTileB: '#162039',
  floorEdge: '#253659',
  floorShadow: 'rgba(0, 0, 0, 0.4)',

  wallTop: '#1e2f4a',
  wallSideLight: '#253659',
  wallSideDark: '#111d30',
  wallBorder: '#3b82f6',

  tableTopAvail: '#253659',
  tableTopOccupied: '#7f1d1d',
  tableTopReserved: '#1e3a8a',
  tableSideLight: '#1d2e4a',
  tableSideDark: '#111d30',
  tableClothOccupied: '#dc2626',

  chairTop: '#1e3a5f',
  chairSide: '#162d4a',
  chairLeg: '#0f2040',

  kitchenCounter: '#1f2937',
  kitchenCounterSide: '#111827',
  kitchenAppliance: '#374151',
  kitchenFlame: '#f97316',

  barTop: '#312e81',
  barSide: '#1e1b4b',

  objectTop: '#1e2d40',
  objectSide: '#152030',

  lightGlow: 'rgba(59, 130, 246, 0.12)',
  ambientBg: '#0f172a',

  labelColor: '#e2e8f0',
  statusColor: '#f8fafc',
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

type Pt = { screenX: number; screenY: number };

function polygon(ctx: CanvasRenderingContext2D, pts: Pt[], fill?: string, stroke?: string, lineWidth = 1) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].screenX, pts[0].screenY);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].screenX, pts[i].screenY);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function liftPoints(pts: Pt[], h: number): Pt[] {
  return pts.map(p => ({ screenX: p.screenX, screenY: p.screenY - h }));
}

// ─────────────────────────────────────────────────────────────
// FLOOR
// ─────────────────────────────────────────────────────────────

export function drawFloor(
  ctx: CanvasRenderingContext2D,
  gridW: number,
  gridH: number,
  offsetX: number,
  offsetY: number,
  palette: SimPalette
) {
  for (let gx = 0; gx < gridW; gx++) {
    for (let gy = 0; gy < gridH; gy++) {
      const p0 = toIsometric(gx, gy, offsetX, offsetY);
      const p1 = toIsometric(gx + 1, gy, offsetX, offsetY);
      const p2 = toIsometric(gx + 1, gy + 1, offsetX, offsetY);
      const p3 = toIsometric(gx, gy + 1, offsetX, offsetY);

      // Alternating tile colors for checkerboard effect
      const isEven = (gx + gy) % 2 === 0;
      polygon(ctx, [p0, p1, p2, p3], isEven ? palette.floorTileA : palette.floorTileB, palette.floorEdge, 0.5);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// WALLS (perimeter)
// ─────────────────────────────────────────────────────────────

export function drawPerimeterWalls(
  ctx: CanvasRenderingContext2D,
  gridW: number,
  gridH: number,
  offsetX: number,
  offsetY: number,
  palette: SimPalette
) {
  const WALL_H = 28;

  // Top-left wall (along x axis, y=0)
  for (let gx = 0; gx < gridW; gx++) {
    const p0 = toIsometric(gx, 0, offsetX, offsetY);
    const p1 = toIsometric(gx + 1, 0, offsetX, offsetY);
    const t0 = { screenX: p0.screenX, screenY: p0.screenY - WALL_H };
    const t1 = { screenX: p1.screenX, screenY: p1.screenY - WALL_H };
    polygon(ctx, [p0, p1, t1, t0], palette.wallTop, palette.wallBorder, 0.5);
  }

  // Top-right wall (along y axis, x=0)
  for (let gy = 0; gy < gridH; gy++) {
    const p0 = toIsometric(0, gy, offsetX, offsetY);
    const p1 = toIsometric(0, gy + 1, offsetX, offsetY);
    const t0 = { screenX: p0.screenX, screenY: p0.screenY - WALL_H };
    const t1 = { screenX: p1.screenX, screenY: p1.screenY - WALL_H };
    polygon(ctx, [p0, p1, t1, t0], palette.wallSideLight, palette.wallBorder, 0.5);
  }
}

// ─────────────────────────────────────────────────────────────
// CHAIR (small helper)
// ─────────────────────────────────────────────────────────────

function drawChairAt(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  offsetX: number,
  offsetY: number,
  palette: SimPalette
) {
  const CHAIR_H = 10;
  const p0 = toIsometric(gx, gy, offsetX, offsetY);
  const p1 = toIsometric(gx + 0.6, gy, offsetX, offsetY);
  const p2 = toIsometric(gx + 0.6, gy + 0.6, offsetX, offsetY);
  const p3 = toIsometric(gx, gy + 0.6, offsetX, offsetY);
  const top = liftPoints([p0, p1, p2, p3], CHAIR_H);

  // Seat
  polygon(ctx, [p3, p2, top[2], top[3]], palette.chairSide, undefined);
  polygon(ctx, [p2, p1, top[1], top[2]], palette.chairSide, undefined);
  polygon(ctx, top, palette.chairTop, palette.chairLeg, 0.5);

  // Backrest (small vertical slab on one side)
  const br0 = toIsometric(gx, gy, offsetX, offsetY);
  const br1 = toIsometric(gx + 0.6, gy, offsetX, offsetY);
  const brt0 = { screenX: br0.screenX, screenY: br0.screenY - CHAIR_H - 7 };
  const brt1 = { screenX: br1.screenX, screenY: br1.screenY - CHAIR_H - 7 };
  const brt0b = { screenX: br0.screenX, screenY: br0.screenY - CHAIR_H };
  const brt1b = { screenX: br1.screenX, screenY: br1.screenY - CHAIR_H };
  polygon(ctx, [brt0b, brt1b, brt1, brt0], palette.chairTop, palette.chairLeg, 0.5);
}

// ─────────────────────────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────────────────────────

export function drawDetailedTable(
  ctx: CanvasRenderingContext2D,
  table: SimTable,
  offsetX: number,
  offsetY: number,
  palette: SimPalette,
  animFrame: number
) {
  const { x_pos: gx, y_pos: gy, width: gw, height: gh, status } = table;
  const TABLE_H = 14;

  const p0 = toIsometric(gx, gy, offsetX, offsetY);
  const p1 = toIsometric(gx + gw, gy, offsetX, offsetY);
  const p2 = toIsometric(gx + gw, gy + gh, offsetX, offsetY);
  const p3 = toIsometric(gx, gy + gh, offsetX, offsetY);
  const top = liftPoints([p0, p1, p2, p3], TABLE_H);

  // Draw chairs around table
  // Top-left chair
  drawChairAt(ctx, gx - 0.7, gy + (gh - 0.6) / 2, offsetX, offsetY, palette);
  // Top-right chair
  drawChairAt(ctx, gx + gw + 0.1, gy + (gh - 0.6) / 2, offsetX, offsetY, palette);
  // Bottom-left chair
  drawChairAt(ctx, gx + (gw - 0.6) / 2, gy - 0.7, offsetX, offsetY, palette);
  // Bottom-right chair
  drawChairAt(ctx, gx + (gw - 0.6) / 2, gy + gh + 0.1, offsetX, offsetY, palette);

  // Table body
  let topColor = palette.tableTopAvail;
  let sideLight = palette.tableSideLight;
  let sideDark = palette.tableSideDark;

  if (status === 'occupied') { topColor = palette.tableTopOccupied; }
  if (status === 'reserved') { topColor = palette.tableTopReserved; }

  // Shadow
  polygon(ctx, [p0, p1, p2, p3], palette.floorShadow, undefined);

  // Side faces
  polygon(ctx, [p3, p2, top[2], top[3]], sideLight, 'rgba(0,0,0,0.15)', 0.5);
  polygon(ctx, [p2, p1, top[1], top[2]], sideDark, 'rgba(0,0,0,0.2)', 0.5);

  // Table top
  polygon(ctx, top, topColor, 'rgba(0,0,0,0.15)', 0.5);

  // Tablecloth accent stripe
  if (status === 'occupied') {
    const inset = 2;
    const i0 = { screenX: top[0].screenX + inset, screenY: top[0].screenY };
    const i1 = { screenX: top[1].screenX - inset, screenY: top[1].screenY };
    const i2 = { screenX: top[2].screenX - inset, screenY: top[2].screenY };
    const i3 = { screenX: top[3].screenX + inset, screenY: top[3].screenY };
    polygon(ctx, [i0, i1, i2, i3], 'rgba(255,255,255,0.15)', undefined);

    // Plates on occupied tables
    const cx = (top[0].screenX + top[2].screenX) / 2;
    const cy = (top[0].screenY + top[2].screenY) / 2 - 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 5, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f5f5';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 3, 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
  }

  // Table name label
  const labelX = (top[0].screenX + top[2].screenX) / 2;
  const labelY = top[0].screenY - 4;
  ctx.fillStyle = palette.labelColor;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(table.name, labelX, labelY);

  // Status floating icon
  const iconY = top[0].screenY - TABLE_H - 10;
  const iconX = (top[0].screenX + top[1].screenX) / 2;
  ctx.font = '13px serif';
  ctx.textAlign = 'center';
  if (status === 'occupied') ctx.fillText('🍽️', iconX, iconY);
  else if (status === 'reserved') ctx.fillText('🔖', iconX, iconY);
}

// ─────────────────────────────────────────────────────────────
// KITCHEN
// ─────────────────────────────────────────────────────────────

export function drawKitchen(
  ctx: CanvasRenderingContext2D,
  obj: SimLayoutObject,
  offsetX: number,
  offsetY: number,
  palette: SimPalette,
  animFrame: number,
  isCooking: boolean
) {
  const { x_pos: gx, y_pos: gy, width: gw, height: gh } = obj;
  const KITCHEN_H = 28;

  const p0 = toIsometric(gx, gy, offsetX, offsetY);
  const p1 = toIsometric(gx + gw, gy, offsetX, offsetY);
  const p2 = toIsometric(gx + gw, gy + gh, offsetX, offsetY);
  const p3 = toIsometric(gx, gy + gh, offsetX, offsetY);
  const top = liftPoints([p0, p1, p2, p3], KITCHEN_H);

  // Shadow
  polygon(ctx, [p0, p1, p2, p3], palette.floorShadow, undefined);

  // Body
  polygon(ctx, [p3, p2, top[2], top[3]], palette.kitchenCounterSide, 'rgba(0,0,0,0.2)', 0.5);
  polygon(ctx, [p2, p1, top[1], top[2]], palette.kitchenCounter, 'rgba(0,0,0,0.25)', 0.5);
  polygon(ctx, top, palette.kitchenCounter, 'rgba(0,0,0,0.15)', 0.5);

  // Stove tops (circles on counter surface)
  const stovePositions = [
    [gx + gw * 0.25, gy + gh * 0.3],
    [gx + gw * 0.6, gy + gh * 0.3],
    [gx + gw * 0.25, gy + gh * 0.7],
    [gx + gw * 0.6, gy + gh * 0.7],
  ];
  stovePositions.forEach(([sx, sy]) => {
    const sp = toIsometric(sx, sy, offsetX, offsetY);
    const stoveY = sp.screenY - KITCHEN_H;

    // Burner ring
    ctx.beginPath();
    ctx.ellipse(sp.screenX, stoveY, 7, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.kitchenAppliance;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Flame when cooking
    if (isCooking) {
      const flicker = Math.sin(animFrame * Math.PI * 8) * 1.5;
      ctx.beginPath();
      ctx.ellipse(sp.screenX, stoveY - 3 - flicker, 3, 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = palette.kitchenFlame;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Steam rising
      if (Math.sin(animFrame * Math.PI * 4) > 0.5) {
        for (let s = 0; s < 3; s++) {
          const sx2 = sp.screenX + (s - 1) * 4;
          const steamAlpha = 0.4 - s * 0.1;
          ctx.beginPath();
          ctx.arc(sx2, stoveY - 8 - s * 4 + Math.sin(animFrame * 6 + s) * 2, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220,220,220,${steamAlpha})`;
          ctx.fill();
        }
      }
    }
  });

  // Label
  const labelX = (top[0].screenX + top[2].screenX) / 2;
  const labelY = top[0].screenY - KITCHEN_H - 5;
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = palette.labelColor;
  ctx.textAlign = 'center';
  ctx.fillText('🍳 ' + obj.name, labelX, labelY);
}

// ─────────────────────────────────────────────────────────────
// BAR
// ─────────────────────────────────────────────────────────────

export function drawBar(
  ctx: CanvasRenderingContext2D,
  obj: SimLayoutObject,
  offsetX: number,
  offsetY: number,
  palette: SimPalette
) {
  const { x_pos: gx, y_pos: gy, width: gw, height: gh } = obj;
  const BAR_H = 20;

  const p0 = toIsometric(gx, gy, offsetX, offsetY);
  const p1 = toIsometric(gx + gw, gy, offsetX, offsetY);
  const p2 = toIsometric(gx + gw, gy + gh, offsetX, offsetY);
  const p3 = toIsometric(gx, gy + gh, offsetX, offsetY);
  const top = liftPoints([p0, p1, p2, p3], BAR_H);

  polygon(ctx, [p3, p2, top[2], top[3]], palette.barSide, 'rgba(0,0,0,0.15)', 0.5);
  polygon(ctx, [p2, p1, top[1], top[2]], palette.barSide, 'rgba(0,0,0,0.2)', 0.5);
  polygon(ctx, top, palette.barTop, 'rgba(0,0,0,0.1)', 0.5);

  // Bottles on bar
  const cx = (top[0].screenX + top[2].screenX) / 2;
  const cy = (top[0].screenY + top[2].screenY) / 2 - 2;
  ['#e74c3c', '#3498db', '#27ae60'].forEach((color, i) => {
    const bx = cx + (i - 1) * 7;
    ctx.beginPath();
    ctx.roundRect(bx - 2, cy - 10, 4, 10, 1);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  const labelX = (top[0].screenX + top[2].screenX) / 2;
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = palette.labelColor;
  ctx.textAlign = 'center';
  ctx.fillText('🍸 ' + obj.name, labelX, top[0].screenY - BAR_H - 5);
}

// ─────────────────────────────────────────────────────────────
// GENERIC OBJECT (restroom, storage, host stand)
// ─────────────────────────────────────────────────────────────

export function drawGenericObject(
  ctx: CanvasRenderingContext2D,
  obj: SimLayoutObject,
  offsetX: number,
  offsetY: number,
  palette: SimPalette,
  emoji: string
) {
  const { x_pos: gx, y_pos: gy, width: gw, height: gh } = obj;
  const H = obj.type === 'host_stand' ? 16 : 22;

  const p0 = toIsometric(gx, gy, offsetX, offsetY);
  const p1 = toIsometric(gx + gw, gy, offsetX, offsetY);
  const p2 = toIsometric(gx + gw, gy + gh, offsetX, offsetY);
  const p3 = toIsometric(gx, gy + gh, offsetX, offsetY);
  const top = liftPoints([p0, p1, p2, p3], H);

  polygon(ctx, [p0, p1, p2, p3], palette.floorShadow, undefined);
  polygon(ctx, [p3, p2, top[2], top[3]], palette.objectSide, 'rgba(0,0,0,0.1)', 0.5);
  polygon(ctx, [p2, p1, top[1], top[2]], palette.objectSide, 'rgba(0,0,0,0.15)', 0.5);
  polygon(ctx, top, palette.objectTop, 'rgba(0,0,0,0.1)', 0.5);

  const labelX = (top[0].screenX + top[2].screenX) / 2;
  ctx.font = '11px serif';
  ctx.textAlign = 'center';
  ctx.fillText(emoji, labelX, top[0].screenY - H - 3);
  ctx.font = '8px monospace';
  ctx.fillStyle = palette.labelColor;
  ctx.fillText(obj.name, labelX, top[0].screenY - H + 5);
}

// ─────────────────────────────────────────────────────────────
// DECORATIVE PLANT
// ─────────────────────────────────────────────────────────────

export function drawPlant(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  offsetX: number,
  offsetY: number
) {
  const sp = toIsometric(gx, gy, offsetX, offsetY);
  const sx = sp.screenX;
  const sy = sp.screenY;

  // Pot
  ctx.beginPath();
  ctx.roundRect(sx - 5, sy - 8, 10, 8, 2);
  ctx.fillStyle = '#b5651d';
  ctx.fill();

  // Leaves
  [[-3, -12], [0, -16], [3, -12], [-5, -10], [5, -10]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.ellipse(sx + dx, sy + dy, 4, 3, dx * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#27ae60';
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// ─────────────────────────────────────────────────────────────
// LIGHT GLOW OVERLAY
// ─────────────────────────────────────────────────────────────

export function drawLightGlow(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  offsetX: number,
  offsetY: number,
  palette: SimPalette
) {
  const sp = toIsometric(gx, gy, offsetX, offsetY);
  const grad = ctx.createRadialGradient(sp.screenX, sp.screenY, 0, sp.screenX, sp.screenY, 80);
  grad.addColorStop(0, palette.lightGlow);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(sp.screenX, sp.screenY, 80, 50, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─────────────────────────────────────────────────────────────
// DISPATCH — draw any layout object by type
// ─────────────────────────────────────────────────────────────

export function drawLayoutObject(
  ctx: CanvasRenderingContext2D,
  obj: SimLayoutObject,
  offsetX: number,
  offsetY: number,
  palette: SimPalette,
  animFrame: number,
  isCooking: boolean
) {
  switch (obj.type) {
    case 'kitchen':
      drawKitchen(ctx, obj, offsetX, offsetY, palette, animFrame, isCooking);
      break;
    case 'bar':
      drawBar(ctx, obj, offsetX, offsetY, palette);
      break;
    case 'restroom':
      drawGenericObject(ctx, obj, offsetX, offsetY, palette, '🚻');
      break;
    case 'storage':
      drawGenericObject(ctx, obj, offsetX, offsetY, palette, '📦');
      break;
    case 'host_stand':
      drawGenericObject(ctx, obj, offsetX, offsetY, palette, '📋');
      break;
    default:
      drawGenericObject(ctx, obj, offsetX, offsetY, palette, '🏠');
  }
}
