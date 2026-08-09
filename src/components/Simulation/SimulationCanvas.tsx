import React, { useRef, useEffect, useState, useMemo } from 'react';
import { SimTable, SimLayoutObject } from './useSimulationData';
import { SimulationEventBus } from './SimulationEventBus';
import { toScreen, TILE_SIZE } from './rpgUtils';
import { useSimulationEngine } from './useSimulationEngine';
import {
  WARM_PALETTE,
  DARK_PALETTE,
  SimPalette,
  drawFloor,
  drawPerimeterWalls,
  drawDetailedTable,
  drawLayoutObject,
  drawCharacterRpg
} from './rpgRenderer';
import '@/styles/simulation.css';

const GRID_W = 24;
const GRID_H = 16;

interface SimulationCanvasProps {
  tables: SimTable[];
  layoutObjects: SimLayoutObject[];
  eventBus: SimulationEventBus;
  volume: number;
  isDark: boolean;
  isReplayMode?: boolean;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  tables,
  layoutObjects,
  eventBus,
  volume,
  isDark,
  isReplayMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const palette: SimPalette = isDark ? DARK_PALETTE : WARM_PALETTE;

  // Calculate offsets to center the RPG grid on the canvas
  // Grid total width = GRID_W * TILE_SIZE
  const gridPixelW = GRID_W * TILE_SIZE;
  const gridPixelH = GRID_H * TILE_SIZE;
  const offsetX = (dimensions.width - gridPixelW) / 2;
  const offsetY = (dimensions.height - gridPixelH) / 2 + 20; // push down slightly for top wall

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Audio (same as before)
  const audioContext = useRef<AudioContext | null>(null);
  useEffect(() => {
    try {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {}
  }, []);

  const playSound = (type: 'bell' | 'sizzle') => {
    if (!audioContext.current || volume === 0) return;
    const ctx = audioContext.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'bell') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      const bufferSize = ctx.sampleRate * 1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;
      noise.connect(filter);
      filter.connect(gain);
      gain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1);
      noise.start(ctx.currentTime);
    }
  };

  const lastSoundTime = useRef<Record<string, number>>({});

  const isCooking = useMemo(
    () => eventBus.characters.some(c => c.state === 'cook'),
    [eventBus]
  );

  // ── Main Render ──────────────────────────────────────────────
  const render = (ctx: CanvasRenderingContext2D, bus: SimulationEventBus) => {
    const animFrame = (Date.now() % 2000) / 2000; 

    // Background
    ctx.fillStyle = palette.ambientBg;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Floor & Perimeter
    drawFloor(ctx, GRID_W, GRID_H, offsetX, offsetY, palette);
    drawPerimeterWalls(ctx, GRID_W, GRID_H, offsetX, offsetY, palette);

    // Depth-sorted render queue (RPG style relies entirely on Y-coordinate)
    const renderQueue: { depth: number; draw: () => void }[] = [];

    // Layout objects
    layoutObjects.forEach(obj => {
      renderQueue.push({
        depth: obj.y_pos, 
        draw: () => drawLayoutObject(ctx, obj, offsetX, offsetY, palette, animFrame, isCooking),
      });
    });

    // Tables
    tables.forEach(table => {
      renderQueue.push({
        depth: table.y_pos,
        draw: () => drawDetailedTable(ctx, table, offsetX, offsetY, palette, animFrame),
      });
    });

    // Characters
    bus.characters.forEach(char => {
      const { screenX, screenY } = toScreen(char.position.x, char.position.y, offsetX, offsetY);
      
      renderQueue.push({
        depth: char.position.y, 
        draw: () => drawCharacterRpg(
          ctx, 
          screenX, 
          screenY, 
          char.role, 
          char.state, 
          char.config.customImage
        ),
      });

      // Sounds
      const now = Date.now();
      if (char.state === 'cook') {
        if (!lastSoundTime.current['cook'] || now - lastSoundTime.current['cook'] > 2000) {
          playSound('sizzle');
          lastSoundTime.current['cook'] = now;
        }
      }
      if (char.role === 'waiter' && char.state === 'carry_tray' && !char.targetPosition) {
        if (!lastSoundTime.current[`bell_${char.id}`] || now - lastSoundTime.current[`bell_${char.id}`] > 5000) {
          playSound('bell');
          lastSoundTime.current[`bell_${char.id}`] = now;
        }
      }
    });

    // Sort by depth (Y-sorting)
    // Small offset for objects that occupy the exact same Y cell but should render in specific order 
    // is usually not needed if logic correctly spaces them, but we sort stably.
    renderQueue.sort((a, b) => a.depth - b.depth);
    renderQueue.forEach(item => item.draw());

    // Replay Watermark
    if (isReplayMode) {
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
      ctx.font = 'bold 120px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.translate(dimensions.width / 2, dimensions.height / 2);
      ctx.rotate(-Math.PI / 12);
      ctx.fillText('REPLAY', 0, 0);
      ctx.restore();
    }
  };

  useSimulationEngine(canvasRef, eventBus, render);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[600px] rounded-xl overflow-hidden relative transition-colors duration-500"
      style={{ background: palette.ambientBg }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block"
      />
      {volume === 0 && (
        <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur">
          🔇 Muted
        </div>
      )}
    </div>
  );
};
