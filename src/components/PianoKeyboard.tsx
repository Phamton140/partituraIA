import React, { useRef, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import type { MusicNote, Song, PlaybackState } from '../types/music';

interface PianoKeyboardProps {
  song: Song | null;
  playback: PlaybackState;
  onKeyPress?: (midi: number) => void;
}

// Keyboard range: A0 (21) to C8 (108)
const MIN_MIDI = 21;
const MAX_MIDI = 108;
const TOTAL_KEYS = MAX_MIDI - MIN_MIDI + 1;

function isBlackKey(midi: number): boolean {
  const note = midi % 12;
  return [1, 3, 6, 8, 10].includes(note);
}

function getWhiteKeyIndex(midi: number): number {
  const octave = Math.floor((midi - 21) / 12);
  const noteInOct = midi % 12;
  const whiteMap: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
  return octave * 7 + (whiteMap[noteInOct] ?? 0);
}

const WHITE_KEY_COUNT = Array.from({ length: TOTAL_KEYS }, (_, i) => i + MIN_MIDI)
  .filter((m) => !isBlackKey(m)).length;

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({ song, playback, onKeyPress }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const { visuals } = useSettingsStore();

  const getActiveNotes = useCallback((): Map<number, 'left' | 'right'> => {
    if (!song) return new Map();
    const active = new Map<number, 'left' | 'right'>();
    const t = playback.currentTime;
    const window = 0.05; // 50ms lookahead

    for (const track of song.tracks) {
      if (
        !playback.activeHands.has(track.hand) &&
        !playback.activeHands.has('both')
      ) continue;

      for (const note of track.notes) {
        if (note.startTime <= t + window && note.startTime + note.duration > t) {
          active.set(note.midi, track.hand);
        }
      }
    }
    return active;
  }, [song, playback]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const wkW = W / WHITE_KEY_COUNT;
    const wkH = H;
    const bkW = wkW * 0.6;
    const bkH = wkH * 0.62;

    ctx.clearRect(0, 0, W, H);

    const activeNotes = getActiveNotes();

    // Draw white keys
    let wIdx = 0;
    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
      if (isBlackKey(midi)) continue;
      const x = wIdx * wkW;
      const isActive = activeNotes.has(midi);
      const isUserPressed = playback.userPressedKeys.has(midi);
      const hand = activeNotes.get(midi);

      if (isUserPressed) {
        ctx.fillStyle = '#fbbf24'; // Gold for user
      } else if (isActive) {
        const gradient = ctx.createLinearGradient(x, 0, x, wkH);
        if (hand === 'right') {
          gradient.addColorStop(0, visuals.noteColorRight);
          gradient.addColorStop(1, visuals.noteColorRight); // Or dynamic shading
        } else {
          gradient.addColorStop(0, visuals.noteColorLeft);
          gradient.addColorStop(1, visuals.noteColorLeft);
        }
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#ffffff';
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, 0, wkW - 2, wkH - 2, [0, 0, 6, 6]);
      ctx.fill();

      if (!isActive && !isUserPressed) {
        ctx.strokeStyle = '#c0c0c0';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Glow on active
      if (isActive || isUserPressed) {
        ctx.shadowBlur = 18 * visuals.glowIntensity;
        ctx.shadowColor = isUserPressed ? '#fbbf24' : (hand === 'right' ? visuals.noteColorRight : visuals.noteColorLeft);
        ctx.beginPath();
        ctx.roundRect(x + 1, 0, wkW - 2, wkH - 2, [0, 0, 6, 6]);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      wIdx++;
    }

    // Draw black keys on top
    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
      if (!isBlackKey(midi)) continue;
      const leftWhiteIdx = getWhiteKeyIndex(midi - 1);
      const x = leftWhiteIdx * wkW + wkW - bkW / 2;
      const isActive = activeNotes.has(midi);
      const isUserPressed = playback.userPressedKeys.has(midi);
      const hand = activeNotes.get(midi);

      if (isUserPressed) {
        ctx.fillStyle = '#d97706'; // Darker gold for black keys
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#fbbf24';
      } else if (isActive) {
        const gradient = ctx.createLinearGradient(x, 0, x, bkH);
        if (hand === 'right') {
          gradient.addColorStop(0, visuals.noteColorRight);
          gradient.addColorStop(1, visuals.noteColorRight);
        } else {
          gradient.addColorStop(0, visuals.noteColorLeft);
          gradient.addColorStop(1, visuals.noteColorLeft);
        }
        ctx.fillStyle = gradient;

        ctx.shadowBlur = 16 * visuals.glowIntensity;
        ctx.shadowColor = hand === 'right' ? visuals.noteColorRight : visuals.noteColorLeft;
      } else {
        ctx.fillStyle = '#1e1b2e';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(x, 0, bkW, bkH, [0, 0, 5, 5]);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [getActiveNotes]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="piano-keyboard-wrapper">
      <canvas
        ref={canvasRef}
        className="piano-canvas"
        onClick={(e) => {
          if (!onKeyPress) return;
          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const wkW = rect.width / WHITE_KEY_COUNT;
          const approxMidi = MIN_MIDI + Math.floor(x / wkW);
          onKeyPress(approxMidi);
        }}
      />
    </div>
  );
};

export default PianoKeyboard;
