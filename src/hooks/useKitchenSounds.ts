import { useState, useEffect, useCallback } from 'react';

const AUDIO_ENABLED_KEY = 'kds_audio_enabled';

export const useKitchenSounds = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    return localStorage.getItem(AUDIO_ENABLED_KEY) === 'true';
  });

  const enableAudio = useCallback(() => {
    localStorage.setItem(AUDIO_ENABLED_KEY, 'true');
    setIsAudioEnabled(true);
    window.dispatchEvent(new Event('kds_audio_changed'));
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Failed to unlock audio context:", e);
    }
  }, []);

  const disableAudio = useCallback(() => {
    localStorage.setItem(AUDIO_ENABLED_KEY, 'false');
    setIsAudioEnabled(false);
    window.dispatchEvent(new Event('kds_audio_changed'));
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAudioEnabled(localStorage.getItem(AUDIO_ENABLED_KEY) === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('kds_audio_changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('kds_audio_changed', handleStorageChange);
    };
  }, []);

  const playTone = useCallback((frequencies: number[], duration: number, type: OscillatorType = 'sine', gap = 0.1) => {
    const enabled = localStorage.getItem(AUDIO_ENABLED_KEY) === 'true';
    if (!enabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      let time = audioCtx.currentTime;
      frequencies.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.85, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.02);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(time);
        osc.stop(time + duration);
        time += duration + gap;
      });
    } catch (e) {
      console.warn("Error playing tone:", e);
    }
  }, []);

  const playNewOrder = useCallback(() => {
    playTone([523.25, 659.25], 0.2, 'sine', 0.05);
  }, [playTone]);

  const playModified = useCallback(() => {
    playTone([392, 392], 0.12, 'triangle', 0.04);
  }, [playTone]);

  const playRushOrder = useCallback(() => {
    playTone([880, 698.46, 880, 698.46], 0.15, 'sawtooth', 0.05);
  }, [playTone]);

  const playReadyChime = useCallback(() => {
    playTone([587.33, 880], 0.35, 'sine', 0.1);
  }, [playTone]);

  return {
    isAudioEnabled,
    enableAudio,
    disableAudio,
    playNewOrder,
    playModified,
    playRushOrder,
    playReadyChime
  };
};
