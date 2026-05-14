import React from 'react';
import {
  Play, Pause, Square, SkipBack, SkipForward,
  Repeat, Gauge, Hand, Music2
} from 'lucide-react';
import type { PlaybackState, Song } from '../types/music';

interface TransportBarProps {
  song: Song | null;
  playback: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (t: number) => void;
  onSpeedChange: (s: number) => void;
  onHandToggle: (hand: 'left' | 'right') => void;
  onLoopToggle: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

const TransportBar: React.FC<TransportBarProps> = ({
  song, playback, onPlay, onPause, onStop, onSeek,
  onSpeedChange, onHandToggle, onLoopToggle, onSkipBack, onSkipForward
}) => {
  const duration = song?.totalDuration ?? 0;
  const pct = duration > 0 ? (playback.currentTime / duration) * 100 : 0;

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    onSeek((v / 100) * duration);
  };

  return (
    <div className="transport-bar">
      {/* Song info */}
      <div className="transport-info">
        <Music2 size={16} className="transport-icon" />
        <div>
          <p className="transport-title">{song?.title ?? 'No song loaded'}</p>
          {song && (
            <p className="transport-meta">
              {song.composer ?? ''} · {song.tempo} BPM · {song.timeSignature[0]}/{song.timeSignature[1]}
            </p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="transport-timeline">
        <span className="time-label">{formatTime(playback.currentTime)}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={0.01}
          value={pct}
          onChange={handleScrub}
          className="scrubber"
          disabled={!song}
        />
        <span className="time-label">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="transport-controls">
        <button className="ctrl-btn" onClick={onSkipBack} disabled={!song} title="Skip back">
          <SkipBack size={18} />
        </button>

        <button className="ctrl-btn" onClick={onStop} disabled={!song} title="Stop">
          <Square size={18} />
        </button>

        {playback.isPlaying ? (
          <button className="ctrl-btn primary" onClick={onPause} disabled={!song} title="Pause">
            <Pause size={22} />
          </button>
        ) : (
          <button className="ctrl-btn primary" onClick={onPlay} disabled={!song} title="Play">
            <Play size={22} />
          </button>
        )}

        <button className="ctrl-btn" onClick={onSkipForward} disabled={!song} title="Skip forward">
          <SkipForward size={18} />
        </button>

        <button
          className={`ctrl-btn ${playback.isLooping ? 'active' : ''}`}
          onClick={onLoopToggle}
          disabled={!song}
          title="Loop"
        >
          <Repeat size={18} />
        </button>
      </div>

      {/* Speed + Hand filters */}
      <div className="transport-options">
        <div className="speed-control">
          <Gauge size={14} />
          <select
            value={playback.speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="speed-select"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>
        </div>

        <div className="hand-controls">
          <Hand size={14} />
          <button
            className={`hand-btn right ${playback.activeHands.has('right') ? 'active' : ''}`}
            onClick={() => onHandToggle('right')}
            title="Right hand"
          >R</button>
          <button
            className={`hand-btn left ${playback.activeHands.has('left') ? 'active' : ''}`}
            onClick={() => onHandToggle('left')}
            title="Left hand"
          >L</button>
        </div>
      </div>
    </div>
  );
};

export default TransportBar;
