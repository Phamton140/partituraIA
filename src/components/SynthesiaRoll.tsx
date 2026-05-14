import React, { useRef, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Song, PlaybackState } from '../types/music';

interface SynthesiaRollProps {
  song: Song | null;
  playback: PlaybackState;
  onSeek?: (time: number) => void;
}

// Keyboard range constants (must match PianoKeyboard)
const MIN_MIDI = 21;
const MAX_MIDI = 108;
const TOTAL_KEYS = MAX_MIDI - MIN_MIDI + 1;

function isBlackKey(midi: number): boolean {
  const note = midi % 12;
  return [1, 3, 6, 8, 10].includes(note);
}

// Map midi → x pixel position (matching the piano layout)
function midiToX(midi: number, totalWhites: number, canvasW: number): number {
  const wkW = canvasW / totalWhites;
  // Count white keys up to this midi
  let wCount = 0;
  for (let m = MIN_MIDI; m < midi; m++) {
    if (!isBlackKey(m)) wCount++;
  }
  if (isBlackKey(midi)) {
    // Center on gap between two white keys
    const leftW = wCount;
    return leftW * wkW + wkW - (wkW * 0.6) / 2;
  }
  return wCount * wkW;
}

function keyWidth(midi: number, totalWhites: number, canvasW: number): number {
  const wkW = canvasW / totalWhites;
  return isBlackKey(midi) ? wkW * 0.6 : wkW;
}

const WHITE_KEY_COUNT = Array.from({ length: TOTAL_KEYS }, (_, i) => i + MIN_MIDI)
  .filter((m) => !isBlackKey(m)).length;

// How many seconds of notes are visible in the roll
const VISIBLE_SECONDS = 4;

const SynthesiaRoll: React.FC<SynthesiaRollProps> = ({ song, playback, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const { visuals } = useSettingsStore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    // Resize if needed
    if (canvas.width !== W * devicePixelRatio || canvas.height !== H * devicePixelRatio) {
      canvas.width = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f0a1e');
    bg.addColorStop(1, '#1a1030');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines (beat lines)
    if (song) {
      const pixPerSec = H / VISIBLE_SECONDS;
      const beatDur = 60 / (song.tempo * playback.speed);
      const t = playback.currentTime;
      let beatT = Math.floor(t / beatDur) * beatDur;
      while (beatT < t + VISIBLE_SECONDS) {
        const y = H - (beatT - t) * pixPerSec;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        beatT += beatDur;
      }
    }

    if (!song) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const t = playback.currentTime;
    const pixPerSec = H / VISIBLE_SECONDS;

    // Draw note bars
    for (const track of song.tracks) {
      if (
        !playback.activeHands.has(track.hand) &&
        !playback.activeHands.has('both')
      ) continue;

      const isRight = track.hand === 'right';

      for (const note of track.notes) {
        const noteStart = note.startTime;
        const noteEnd = note.startTime + note.duration;

        // Only draw notes visible in the window
        if (noteEnd < t - 0.1 || noteStart > t + VISIBLE_SECONDS) continue;

        const x = midiToX(note.midi, WHITE_KEY_COUNT, W);
        const w = keyWidth(note.midi, WHITE_KEY_COUNT, W);

        // y: bottom of canvas = current time, top = future
        const yBottom = H - (noteStart - t) * pixPerSec;
        const yTop = H - (noteEnd - t) * pixPerSec;
        const noteH = Math.max(yBottom - yTop, 4);

        const isActive = noteStart <= t + 0.05 && noteEnd > t;
        const isPast = noteEnd <= t;

        // Bar gradient
        const grad = ctx.createLinearGradient(x, yTop, x + w, yTop);
        if (isActive) {
          if (isRight) {
            grad.addColorStop(0, visuals.noteColorRight);
            grad.addColorStop(1, visuals.noteColorRight);
          } else {
            grad.addColorStop(0, visuals.noteColorLeft);
            grad.addColorStop(1, visuals.noteColorLeft);
          }
        } else if (isPast) {
          grad.addColorStop(0, isRight ? `${visuals.noteColorRight}40` : `${visuals.noteColorLeft}40`);
          grad.addColorStop(1, isRight ? `${visuals.noteColorRight}25` : `${visuals.noteColorLeft}25`);
        } else {
          // Future
          grad.addColorStop(0, isRight ? visuals.noteColorRight : visuals.noteColorLeft);
          grad.addColorStop(1, isRight ? `${visuals.noteColorRight}cc` : `${visuals.noteColorLeft}cc`);
        }

        const radius = Math.min(4, noteH / 2);

        // Glow for active
        if (isActive) {
          ctx.shadowBlur = 20 * visuals.glowIntensity;
          ctx.shadowColor = isRight ? visuals.noteColorRight : visuals.noteColorLeft;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x + 1, yTop, w - 2, noteH, radius);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Finger number
        if (visuals.showFingerHints && note.finger && noteH > 16 && w > 10) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = `bold ${Math.min(12, w - 2)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(note.finger), x + w / 2, yTop + Math.min(10, noteH / 2));
        }
      }
    }

    // Playhead line
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.stroke();
    ctx.shadowBlur = 0;

    rafRef.current = requestAnimationFrame(draw);
  }, [song, playback]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!song || !onSeek) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const H = rect.height;
    // y=H → current time, y=0 → current time + VISIBLE_SECONDS
    const offset = ((H - y) / H) * VISIBLE_SECONDS;
    onSeek(Math.max(0, playback.currentTime - offset));
  };

  return (
    <div className="synthesia-roll-wrapper">
      <canvas
        ref={canvasRef}
        className="synthesia-canvas"
        onClick={handleClick}
        style={{ cursor: 'crosshair' }}
      />
    </div>
  );
};

export default SynthesiaRoll;
