export type Hand = 'left' | 'right' | 'both';
export type NoteState = 'idle' | 'active' | 'played';

export interface MusicNote {
  id: string;
  midi: number;          // MIDI note number (0–127)
  name: string;          // e.g. "C4"
  startTime: number;     // seconds from start
  duration: number;      // seconds
  hand: Hand;
  velocity: number;      // 0–127
  finger?: number;       // suggested finger 1–5
}

export interface MusicTrack {
  id: string;
  name: string;
  hand: Hand;
  notes: MusicNote[];
  color: string;
}

export interface Song {
  id: string;
  title: string;
  composer?: string;
  tempo: number;         // BPM
  timeSignature: [number, number];
  totalDuration: number; // seconds
  tracks: MusicTrack[];
  sourceType: 'midi' | 'demo' | 'omr';
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  loopStart?: number;
  loopEnd?: number;
  isLooping: boolean;
  activeHands: Set<Hand>;
  userPressedKeys: Set<number>;
}

export interface AnalysisResult {
  status: 'idle' | 'processing' | 'success' | 'error';
  progress: number;
  stage: string;
  song?: Song;
  error?: string;
}

// MIDI note number → note name helper
export function midiToName(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${notes[midi % 12]}${octave}`;
}

export function nameToMidi(name: string): number {
  const noteMap: Record<string, number> = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4,
    F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
    'A#': 10, Bb: 10, B: 11,
  };
  const match = name.match(/^([A-G][b#]?)(\d+)$/);
  if (!match) return 60;
  const [, note, octave] = match;
  return noteMap[note] + (parseInt(octave) + 1) * 12;
}
