/**
 * ReplayController.ts
 * State machine for simulation replay playback.
 * Controls: play, pause, seek, speed, step.
 */

import { ReplayTimeline, ReplaySnapshot } from './useReplayData';

export type PlaybackSpeed = 1 | 2 | 5 | 10 | 60;

export type ReplayState = 'idle' | 'playing' | 'paused' | 'ended';

export type ReplayControllerListener = (
  snapshot: ReplaySnapshot,
  index: number,
  state: ReplayState
) => void;

export class ReplayController {
  private timeline: ReplayTimeline | null = null;
  private currentIndex: number = 0;
  private speed: PlaybackSpeed = 1;
  private playbackState: ReplayState = 'idle';
  private animFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private accumulatedMs: number = 0;

  private listeners: Set<ReplayControllerListener> = new Set();

  // Each snapshot = 2 real minutes of restaurant time.
  // At speed 1x: 2min = 120 real seconds, that's too slow.
  // So we define: 1 snapshot step = (2 * 60 * 1000) / speed ms of real time.
  // At 1x: 120s per step (each step = 2 restaurant minutes)
  // At 60x: 2s per step → full day in ~12 minutes at 60x
  // We add a faster "wall time" mode:
  // At 1x: 2 restaurant-minutes per 4 real seconds → pleasant demo pace
  private readonly MS_PER_STEP_AT_1X = 4000; // 4 real seconds per 2 restaurant minutes at 1x

  setTimeline(tl: ReplayTimeline) {
    this.stop();
    this.timeline = tl;
    this.currentIndex = 0;
    this.playbackState = 'idle';
    this.emit();
  }

  setSpeed(speed: PlaybackSpeed) {
    this.speed = speed;
  }

  getSpeed(): PlaybackSpeed { return this.speed; }
  getState(): ReplayState { return this.playbackState; }
  getCurrentIndex(): number { return this.currentIndex; }

  get currentSnapshot(): ReplaySnapshot | null {
    if (!this.timeline || this.currentIndex >= this.timeline.snapshots.length) return null;
    return this.timeline.snapshots[this.currentIndex];
  }

  play() {
    if (!this.timeline || this.timeline.snapshots.length === 0) return;
    if (this.currentIndex >= this.timeline.snapshots.length - 1) {
      this.currentIndex = 0; // restart
    }
    this.playbackState = 'playing';
    this.lastFrameTime = 0;
    this.accumulatedMs = 0;
    this.emit();
    this.scheduleFrame();
  }

  pause() {
    this.playbackState = 'paused';
    this.cancelFrame();
    this.emit();
  }

  stop() {
    this.playbackState = 'idle';
    this.cancelFrame();
  }

  seek(index: number) {
    if (!this.timeline) return;
    this.currentIndex = Math.max(0, Math.min(index, this.timeline.snapshots.length - 1));
    if (this.playbackState === 'ended') this.playbackState = 'paused';
    this.emit();
  }

  stepForward() {
    if (!this.timeline) return;
    this.currentIndex = Math.min(this.currentIndex + 1, this.timeline.snapshots.length - 1);
    if (this.playbackState === 'playing') this.pause();
    this.emit();
  }

  stepBack() {
    if (!this.timeline) return;
    this.currentIndex = Math.max(this.currentIndex - 1, 0);
    if (this.playbackState === 'playing') this.pause();
    this.emit();
  }

  rewindToStart() {
    this.currentIndex = 0;
    if (this.playbackState === 'playing') this.pause();
    this.emit();
  }

  addListener(fn: ReplayControllerListener) {
    this.listeners.add(fn);
  }

  removeListener(fn: ReplayControllerListener) {
    this.listeners.delete(fn);
  }

  destroy() {
    this.cancelFrame();
    this.listeners.clear();
  }

  private emit() {
    if (!this.timeline) return;
    const snap = this.timeline.snapshots[this.currentIndex] || null;
    if (snap) {
      this.listeners.forEach(fn => fn(snap, this.currentIndex, this.playbackState));
    }
  }

  private scheduleFrame() {
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private cancelFrame() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private tick = (now: number) => {
    if (this.playbackState !== 'playing') return;

    if (this.lastFrameTime === 0) this.lastFrameTime = now;
    const elapsed = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.accumulatedMs += elapsed * this.speed;
    const msPerStep = this.MS_PER_STEP_AT_1X;

    if (this.accumulatedMs >= msPerStep) {
      this.accumulatedMs -= msPerStep;
      this.currentIndex++;

      if (!this.timeline || this.currentIndex >= this.timeline.snapshots.length) {
        this.currentIndex = (this.timeline?.snapshots.length ?? 1) - 1;
        this.playbackState = 'ended';
        this.cancelFrame();
        this.emit();
        return;
      }

      this.emit();
    }

    this.scheduleFrame();
  };
}
