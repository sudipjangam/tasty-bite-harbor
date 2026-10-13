/**
 * Audio and haptic feedback utilities for barcode scanner.
 * Uses Web Audio API oscillator so it works offline with zero external audio assets.
 */
export const playScanSuccessFeedback = () => {
  // Mobile haptic feedback
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(70);
    }
  } catch {
    // Ignore haptic errors on unsupported devices
  }

  // Synthesized scan beep (clean dual-tone pop)
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // 1760Hz high affirmative beep
      osc.frequency.setValueAtTime(1760, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);

      // Close context shortly after
      setTimeout(() => {
        try {
          ctx.close();
        } catch {}
      }, 200);
    }
  } catch {
    // Autoplay restrictions or unavailable audio device
  }
};
