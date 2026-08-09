/**
 * PixiSimulation.tsx
 * Main PixiJS-powered restaurant simulation renderer.
 * Replaces the old Canvas 2D SimulationCanvas.
 *
 * Features:
 * - WebGL2 rendering via PixiJS v8
 * - Procedural pixel-art drawing (with sprite sheet support ready)
 * - Y-sorted depth ordering
 * - Smooth character movement interpolation
 * - Dark/light theme support
 * - Replay mode watermark
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js';
import { SimTable, SimLayoutObject } from './useSimulationData';
import { SimulationEventBus } from './SimulationEventBus';
import { PixiCharacter } from './PixiCharacter';
import { loadAllSprites } from './spriteLoader';

// ── Constants ───────────────────────────────────────────────────

const TILE = 32;          // Pixel size of one grid cell
const GRID_W = 24;
const GRID_H = 16;
const WALL_THICK = 20;

// ── Color Palettes ──────────────────────────────────────────────

interface Palette {
  bg: number;
  floorA: number;
  floorB: number;
  floorLine: number;
  wallOuter: number;
  wallInner: number;
  wallTrim: number;
  tableWood: number;
  tableOccupied: number;
  tableLeg: number;
  chairSeat: number;
  chairBack: number;
  kitchenFloor: number;
  counterTop: number;
  counterSide: number;
  text: number;
  textBg: number;
  plantGreen: number;
  plantPot: number;
  doorMat: number;
}

const WARM: Palette = {
  bg:            0xc9b896,
  floorA:        0xe8dcc8,
  floorB:        0xddd0b8,
  floorLine:     0xcfc0a4,
  wallOuter:     0x6b4c3b,
  wallInner:     0x8b6b52,
  wallTrim:      0xa8845e,
  tableWood:     0xc4956a,
  tableOccupied: 0xb85c4a,
  tableLeg:      0x7a5a40,
  chairSeat:     0xa07850,
  chairBack:     0x7a5a40,
  kitchenFloor:  0xd6cbb0,
  counterTop:    0xe0ddd5,
  counterSide:   0xb0ada5,
  text:          0x3b2a1a,
  textBg:        0xfff8e6,
  plantGreen:    0x5a9e4b,
  plantPot:      0x8b5e3c,
  doorMat:       0x8b6040,
};

const DARK: Palette = {
  bg:            0x131820,
  floorA:        0x232d3a,
  floorB:        0x1e2735,
  floorLine:     0x1a2230,
  wallOuter:     0x0f151e,
  wallInner:     0x1a2335,
  wallTrim:      0x2a3a52,
  tableWood:     0x3a4d65,
  tableOccupied: 0x5a3040,
  tableLeg:      0x1e2a3a,
  chairSeat:     0x2e3d50,
  chairBack:     0x1e2a3a,
  kitchenFloor:  0x1e2a35,
  counterTop:    0x3a4555,
  counterSide:   0x2a3545,
  text:          0xc0d0e0,
  textBg:        0x141e2d,
  plantGreen:    0x3a6a3a,
  plantPot:      0x2a3a2a,
  doorMat:       0x3a3020,
};

// ── Props ───────────────────────────────────────────────────────

interface PixiSimulationProps {
  tables: SimTable[];
  layoutObjects: SimLayoutObject[];
  eventBus: SimulationEventBus;
  volume: number;
  isDark: boolean;
  isReplayMode?: boolean;
}

// ── Component ───────────────────────────────────────────────────

export const PixiSimulation: React.FC<PixiSimulationProps> = ({
  tables,
  layoutObjects,
  eventBus,
  volume,
  isDark,
  isReplayMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const pixiCharsRef = useRef<Map<string, PixiCharacter>>(new Map());
  const tableGfxRef = useRef<Map<string, Container>>(new Map());
  const layoutGfxRef = useRef<Map<string, Container>>(new Map());
  const floorGfxRef = useRef<Graphics | null>(null);
  const wallGfxRef = useRef<Graphics | null>(null);
  const replayLabelRef = useRef<Text | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSoundRef = useRef<Record<string, number>>({});
  const [appInstanceId, setAppInstanceId] = useState(0);

  const palette = isDark ? DARK : WARM;

  // ── Audio ──
  const playSound = useCallback((type: 'bell' | 'sizzle') => {
    if (volume === 0) return;
    const now = Date.now();
    if (lastSoundRef.current[type] && now - lastSoundRef.current[type] < 2000) return;
    lastSoundRef.current[type] = now;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      if (type === 'bell') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else {
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        const gain = ctx.createGain();
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        noise.start(ctx.currentTime);
      }
    } catch (_) {}
  }, [volume]);

  // ── Initialize PixiJS Application ──
  useEffect(() => {
    if (!containerRef.current) return;

    const app = new Application();
    let destroyed = false;

    const init = async () => {
      await app.init({
        resizeTo: containerRef.current!,
        background: palette.bg,
        antialias: false,     // pixel art = no AA
        resolution: 1,
        autoDensity: true,
      });

      if (destroyed) { app.destroy(true); return; }

      containerRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      // Try loading sprites (non-blocking, fallback to procedural)
      loadAllSprites().catch(() => {});

      // Create world container
      const world = new Container();
      world.sortableChildren = true;
      app.stage.addChild(world);
      worldRef.current = world;

      // Center world (done in ticker, but set initial here)
      const totalW = GRID_W * TILE;
      const totalH = GRID_H * TILE;

      // Replay watermark
      const replayLabel = new Text({
        text: 'REPLAY',
        style: new TextStyle({
          fontSize: 80,
          fontWeight: 'bold',
          fill: isDark ? 0xffffff : 0x000000,
          fontFamily: 'sans-serif',
        }),
      });
      replayLabel.alpha = 0.08;
      replayLabel.anchor.set(0.5);
      replayLabel.rotation = -Math.PI / 12;
      replayLabel.x = app.screen.width / 2;
      replayLabel.y = app.screen.height / 2;
      replayLabel.visible = isReplayMode;
      app.stage.addChild(replayLabel);
      replayLabelRef.current = replayLabel;

      // Signal that app is ready for drawing effects
      setAppInstanceId(prev => prev + 1);

      // Main ticker — updates simulation and characters
      app.ticker.add((ticker) => {
        const dt = ticker.deltaTime;

        // Ensure world is centered even if container resized
        if (worldRef.current) {
          const w = app.screen.width;
          const h = app.screen.height;
          worldRef.current.x = (w - (GRID_W * TILE)) / 2;
          worldRef.current.y = (h - (GRID_H * TILE)) / 2 + WALL_THICK;
        }

        // Tick simulation
        eventBus.tick(dt * 16); // Convert to ms-like delta

        // Sync characters
        syncCharacters(dt);

        // Sound triggers
        eventBus.characters.forEach(c => {
          if (c.state === 'cook') playSound('sizzle');
          if (c.role === 'waiter' && c.state === 'carry_tray' && !c.targetPosition) {
            playSound('bell');
          }
        });
      });
    };

    init();

    return () => {
      destroyed = true;
      if (appRef.current) {
        // Cleanup
        pixiCharsRef.current.forEach(c => c.destroy());
        pixiCharsRef.current.clear();
        tableGfxRef.current.forEach(c => c.destroy({ children: true }));
        tableGfxRef.current.clear();
        layoutGfxRef.current.forEach(c => c.destroy({ children: true }));
        layoutGfxRef.current.clear();

        const canvas = appRef.current.canvas as HTMLCanvasElement;
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        worldRef.current = null;
      }
    };
  }, []); // Only create once

  // ── Sync characters from EventBus → PixiCharacters ──
  const syncCharacters = useCallback((dt: number) => {
    const world = worldRef.current;
    if (!world) return;

    const simChars = eventBus.characters;
    const pixiChars = pixiCharsRef.current;

    // Add new characters
    simChars.forEach(sc => {
      if (!pixiChars.has(sc.id)) {
        const pc = new PixiCharacter(sc.id, sc.role, sc.position, TILE);
        pixiChars.set(sc.id, pc);
        world.addChild(pc.container);
      }
    });

    // Remove stale characters
    const simIds = new Set(simChars.map(c => c.id));
    pixiChars.forEach((pc, id) => {
      if (!simIds.has(id)) {
        pc.destroy();
        pixiChars.delete(id);
      }
    });

    // Update all
    simChars.forEach(sc => {
      const pc = pixiChars.get(sc.id);
      if (pc) {
        pc.syncFromSim(sc.position.x, sc.position.y, sc.state);
        pc.update(dt);
      }
    });
  }, [eventBus]);

  // ── Redraw floor + walls when palette changes ──
  useEffect(() => {
    const world = worldRef.current;
    if (!world || appInstanceId === 0) return;

    // Remove old floor/wall
    if (floorGfxRef.current) {
      floorGfxRef.current.destroy();
      floorGfxRef.current = null;
    }
    if (wallGfxRef.current) {
      wallGfxRef.current.destroy();
      wallGfxRef.current = null;
    }

    const floor = new Graphics();
    floor.zIndex = -100;

    // Draw checkerboard floor tiles
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const isAlt = (gx + gy) % 2 === 0;
        floor.rect(gx * TILE, gy * TILE, TILE, TILE);
        floor.fill({ color: isAlt ? palette.floorA : palette.floorB });

        // Plank line
        floor.moveTo(gx * TILE, gy * TILE + TILE / 2);
        floor.lineTo(gx * TILE + TILE, gy * TILE + TILE / 2);
        floor.stroke({ color: palette.floorLine, width: 0.5 });
      }
    }

    world.addChild(floor);
    floorGfxRef.current = floor;

    // Walls
    const walls = new Graphics();
    walls.zIndex = -90;
    const totalW = GRID_W * TILE;
    const totalH = GRID_H * TILE;

    // Top wall
    walls.rect(-WALL_THICK, -WALL_THICK, totalW + WALL_THICK * 2, WALL_THICK);
    walls.fill({ color: palette.wallOuter });
    walls.rect(0, -WALL_THICK * 0.4, totalW, WALL_THICK * 0.4);
    walls.fill({ color: palette.wallInner });
    walls.rect(-WALL_THICK, -WALL_THICK, totalW + WALL_THICK * 2, 4);
    walls.fill({ color: palette.wallTrim });

    // Left wall
    walls.rect(-WALL_THICK, -WALL_THICK, WALL_THICK, totalH + WALL_THICK * 2);
    walls.fill({ color: palette.wallOuter });

    // Right wall
    walls.rect(totalW, -WALL_THICK, WALL_THICK, totalH + WALL_THICK * 2);
    walls.fill({ color: palette.wallOuter });

    // Bottom wall
    walls.rect(-WALL_THICK, totalH, totalW + WALL_THICK * 2, WALL_THICK);
    walls.fill({ color: palette.wallOuter });

    // Door opening (bottom center)
    const doorW = TILE * 3;
    const doorX = (totalW - doorW) / 2;
    walls.rect(doorX, totalH, doorW, WALL_THICK);
    walls.fill({ color: palette.floorA });
    walls.rect(doorX + 4, totalH + 3, doorW - 8, WALL_THICK - 6);
    walls.fill({ color: palette.doorMat });

    // Corner plants
    drawPlantGfx(walls, 6, 6, palette);
    drawPlantGfx(walls, totalW - 22, 6, palette);
    drawPlantGfx(walls, 6, totalH - 22, palette);
    drawPlantGfx(walls, totalW - 22, totalH - 22, palette);

    world.addChild(walls);
    wallGfxRef.current = walls;

    // Update app background
    if (appRef.current) {
      appRef.current.renderer.background.color = palette.bg;
    }

    // Update replay label
    if (replayLabelRef.current) {
      replayLabelRef.current.style.fill = isDark ? 0xffffff : 0x000000;
    }
  }, [isDark, palette, appInstanceId]);

  // ── Redraw tables when data changes ──
  useEffect(() => {
    const world = worldRef.current;
    if (!world || appInstanceId === 0) return;

    // Remove old table graphics
    tableGfxRef.current.forEach(c => c.destroy({ children: true }));
    tableGfxRef.current.clear();

    tables.forEach(table => {
      const c = new Container();
      c.sortableChildren = true;
      const g = new Graphics();
      c.addChild(g);

      const tw = table.width * TILE;
      const th = table.height * TILE;
      const isOccupied = table.status === 'occupied';
      const isReserved = table.status === 'reserved';

      // Position
      c.x = table.x_pos * TILE;
      c.y = table.y_pos * TILE;
      c.zIndex = table.y_pos;

      // Chairs around table
      const capacity = table.capacity || 4;
      const chairSize = Math.min(TILE * 0.35, 12);
      const cp = 3; // chair padding

      // Top chairs
      const topN = Math.ceil(capacity / 4);
      for (let i = 0; i < topN; i++) {
        const cx = tw / 2 - (topN * (chairSize + 3)) / 2 + i * (chairSize + 3);
        g.rect(cx, -chairSize - cp, chairSize, chairSize);
        g.fill({ color: palette.chairBack });
        g.rect(cx + 1, -chairSize - cp + 1, chairSize - 2, chairSize - 2);
        g.fill({ color: palette.chairSeat });
      }
      // Bottom chairs
      for (let i = 0; i < topN; i++) {
        const cx = tw / 2 - (topN * (chairSize + 3)) / 2 + i * (chairSize + 3);
        g.rect(cx, th + cp, chairSize, chairSize);
        g.fill({ color: palette.chairBack });
        g.rect(cx + 1, th + cp + 1, chairSize - 2, chairSize - 2);
        g.fill({ color: palette.chairSeat });
      }
      // Left chairs
      const sideN = Math.max(1, Math.floor(capacity / 4));
      for (let i = 0; i < sideN; i++) {
        const cy = th / 2 - (sideN * (chairSize + 3)) / 2 + i * (chairSize + 3);
        g.rect(-chairSize - cp, cy, chairSize, chairSize);
        g.fill({ color: palette.chairBack });
        g.rect(-chairSize - cp + 1, cy + 1, chairSize - 2, chairSize - 2);
        g.fill({ color: palette.chairSeat });
      }
      // Right chairs
      for (let i = 0; i < sideN; i++) {
        const cy = th / 2 - (sideN * (chairSize + 3)) / 2 + i * (chairSize + 3);
        g.rect(tw + cp, cy, chairSize, chairSize);
        g.fill({ color: palette.chairBack });
        g.rect(tw + cp + 1, cy + 1, chairSize - 2, chairSize - 2);
        g.fill({ color: palette.chairSeat });
      }

      // Table surface
      g.roundRect(3, 3, tw - 6, th - 6, 3);
      g.fill({ color: isOccupied ? palette.tableOccupied : palette.tableWood });
      g.roundRect(3, 3, tw - 6, th - 6, 3);
      g.stroke({ color: palette.tableLeg, width: 1.5 });

      // Table contents
      if (isOccupied) {
        // Plates with food
        const plateR = Math.min(tw, th) * 0.1;
        g.circle(tw * 0.35, th * 0.4, plateR);
        g.fill({ color: 0xffffff });
        g.circle(tw * 0.35, th * 0.4, plateR * 0.6);
        g.fill({ color: 0xe65c3a });

        g.circle(tw * 0.65, th * 0.55, plateR);
        g.fill({ color: 0xffffff });
        g.circle(tw * 0.65, th * 0.55, plateR * 0.5);
        g.fill({ color: 0xd4a843 });
      } else if (isReserved) {
        const resLabel = new Text({
          text: 'RSVD',
          style: new TextStyle({ fontSize: 8, fontWeight: 'bold', fill: 0x3b82f6 }),
        });
        resLabel.anchor.set(0.5);
        resLabel.x = tw / 2;
        resLabel.y = th / 2;
        c.addChild(resLabel);
      } else {
        // Empty — small napkin
        g.rect(tw / 2 - 3, th / 2 - 3, 6, 6);
        g.fill({ color: 0xffffff, alpha: 0.4 });
      }

      // Status dot
      const dotColor = isOccupied ? 0xef4444 : isReserved ? 0x3b82f6 : 0x22c55e;
      g.circle(tw - 6, 6, 3.5);
      g.fill({ color: dotColor });
      g.circle(tw - 6, 6, 3.5);
      g.stroke({ color: 0xffffff, width: 1 });

      // Table name label
      const label = new Text({
        text: table.name,
        style: new TextStyle({
          fontSize: 9,
          fontWeight: 'bold',
          fill: palette.text,
          fontFamily: 'sans-serif',
        }),
      });
      label.anchor.set(0.5, 1);
      label.x = tw / 2;
      label.y = -chairSize - cp - 2;
      c.addChild(label);

      world.addChild(c);
      tableGfxRef.current.set(table.id, c);
    });
  }, [tables, palette, isDark, appInstanceId]);

  // ── Redraw layout objects when data changes ──
  useEffect(() => {
    const world = worldRef.current;
    if (!world || appInstanceId === 0) return;

    layoutGfxRef.current.forEach(c => c.destroy({ children: true }));
    layoutGfxRef.current.clear();

    layoutObjects.forEach(obj => {
      const c = new Container();
      const g = new Graphics();
      c.addChild(g);

      const ow = obj.width * TILE;
      const oh = obj.height * TILE;

      c.x = obj.x_pos * TILE;
      c.y = obj.y_pos * TILE;
      c.zIndex = obj.y_pos;

      if (obj.type === 'kitchen') {
        drawKitchenGfx(g, ow, oh, palette);
      } else if (obj.type === 'bar') {
        drawBarGfx(g, ow, oh, palette);
      } else if (obj.type === 'host_stand') {
        drawHostStandGfx(g, ow, oh, palette);
      } else {
        drawGenericRoomGfx(g, ow, oh, palette, obj.name);
      }

      // Label
      const label = new Text({
        text: obj.name,
        style: new TextStyle({
          fontSize: 8,
          fontWeight: 'bold',
          fill: palette.text,
          fontFamily: 'sans-serif',
        }),
      });
      label.anchor.set(0.5);
      label.x = ow / 2;
      label.y = oh - 8;
      c.addChild(label);

      world.addChild(c);
      layoutGfxRef.current.set(obj.id, c);
    });
  }, [layoutObjects, palette, isDark, appInstanceId]);

  // ── Update replay watermark visibility ──
  useEffect(() => {
    if (replayLabelRef.current) {
      replayLabelRef.current.visible = isReplayMode;
    }
  }, [isReplayMode]);

  // ── Handle resize ──
  useEffect(() => {
    const handleResize = () => {
      const app = appRef.current;
      const world = worldRef.current;
      if (!app || !world) return;
      const totalW = GRID_W * TILE;
      const totalH = GRID_H * TILE;
      world.x = (app.screen.width - totalW) / 2;
      world.y = (app.screen.height - totalH) / 2 + WALL_THICK;

      if (replayLabelRef.current) {
        replayLabelRef.current.x = app.screen.width / 2;
        replayLabelRef.current.y = app.screen.height / 2;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[600px] rounded-xl overflow-hidden relative"
      style={{ background: isDark ? '#131820' : '#c9b896' }}
    >
      {volume === 0 && (
        <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur z-10">
          🔇 Muted
        </div>
      )}
    </div>
  );
};

// ── Drawing Helpers ─────────────────────────────────────────────

function drawPlantGfx(g: Graphics, x: number, y: number, p: Palette) {
  g.rect(x + 2, y + 10, 12, 8);
  g.fill({ color: p.plantPot });
  g.rect(x, y + 8, 16, 3);
  g.fill({ color: p.plantPot });
  g.circle(x + 8, y + 6, 8);
  g.fill({ color: p.plantGreen });
  g.circle(x + 6, y + 4, 3);
  g.fill({ color: 0x7ac060 });
}

function drawKitchenGfx(g: Graphics, w: number, h: number, p: Palette) {
  // Floor
  g.rect(0, 0, w, h);
  g.fill({ color: p.kitchenFloor });
  g.rect(0, 0, w, h);
  g.stroke({ color: p.counterSide, width: 2 });

  // Counter top
  g.rect(4, 4, w - 8, TILE * 0.8);
  g.fill({ color: p.counterTop });
  g.rect(4, 4 + TILE * 0.8, w - 8, 4);
  g.fill({ color: p.counterSide });

  // Burners
  const burnerCount = Math.min(Math.floor((w - 20) / 28), 4);
  const spacing = (w - 20) / burnerCount;
  for (let i = 0; i < burnerCount; i++) {
    const bx = 10 + i * spacing + spacing / 2;
    const by = 4 + TILE * 0.4;
    g.circle(bx, by, 7);
    g.stroke({ color: 0x333333, width: 2 });
    g.circle(bx, by, 3);
    g.stroke({ color: 0x333333, width: 1 });
  }

  // Prep table
  const prepW = w * 0.5;
  const prepH = h * 0.2;
  g.rect((w - prepW) / 2, h * 0.5, prepW, prepH);
  g.fill({ color: p.counterTop });
  g.rect((w - prepW) / 2, h * 0.5, prepW, prepH);
  g.stroke({ color: p.counterSide, width: 1 });

  // Sink
  g.rect(w - 30, h - 25, 20, 15);
  g.fill({ color: 0xb8c8d8 });
  g.rect(w - 27, h - 22, 14, 9);
  g.fill({ color: 0x90a8c0 });
}

function drawBarGfx(g: Graphics, w: number, h: number, p: Palette) {
  g.rect(0, 0, w, h);
  g.fill({ color: p.tableWood });
  g.rect(0, 0, w, 3);
  g.fill({ color: p.tableLeg });
  g.rect(0, h - 3, w, 3);
  g.fill({ color: p.tableLeg });

  // Stools
  const stoolCount = Math.max(2, Math.floor(h / (TILE * 0.6)));
  for (let i = 0; i < stoolCount; i++) {
    const sy = 8 + i * ((h - 16) / Math.max(stoolCount - 1, 1));
    g.circle(-8, sy, 5);
    g.fill({ color: p.chairBack });
    g.circle(-8, sy, 3.5);
    g.fill({ color: p.chairSeat });
  }

  // Bottles
  const bottleColors = [0xc0392b, 0x27ae60, 0xf39c12, 0x2980b9];
  for (let i = 0; i < Math.min(4, Math.floor(w / 10)); i++) {
    g.rect(4 + i * 10, 6, 4, 8);
    g.fill({ color: bottleColors[i % bottleColors.length] });
    g.rect(3 + i * 10, 6, 6, 3);
    g.fill({ color: bottleColors[i % bottleColors.length] });
  }
}

function drawHostStandGfx(g: Graphics, w: number, h: number, p: Palette) {
  g.roundRect(4, 4, w - 8, h - 8, 3);
  g.fill({ color: p.tableWood });
  g.roundRect(4, 4, w - 8, h - 8, 3);
  g.stroke({ color: p.tableLeg, width: 1.5 });

  // Menu book
  g.rect(w / 2 - 8, h / 2 - 5, 16, 10);
  g.fill({ color: 0x2c3e50 });
  g.rect(w / 2 - 6, h / 2 - 3, 5, 6);
  g.fill({ color: 0xecf0f1 });
  g.rect(w / 2 + 1, h / 2 - 3, 5, 6);
  g.fill({ color: 0xecf0f1 });
}

function drawGenericRoomGfx(g: Graphics, w: number, h: number, p: Palette, name: string) {
  g.rect(0, 0, w, h);
  g.fill({ color: p.kitchenFloor });
  g.rect(0, 0, w, h);
  g.stroke({ color: p.counterSide, width: 2 });
}
