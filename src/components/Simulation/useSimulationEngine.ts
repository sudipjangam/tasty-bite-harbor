import { useEffect, useRef, MutableRefObject } from 'react';
import { SimulationEventBus } from './SimulationEventBus';

export const useSimulationEngine = (
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  eventBus: SimulationEventBus,
  onRender: (ctx: CanvasRenderingContext2D, eventBus: SimulationEventBus) => void
) => {
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const animate = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Update simulation logic
    eventBus.tick(deltaTime);

    // Render to canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        onRender(ctx, eventBus);
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [eventBus, onRender]); // Re-bind if dependencies change
};
