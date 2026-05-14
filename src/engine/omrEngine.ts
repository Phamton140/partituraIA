import type { Song } from '../types/music';
import { midiToName } from '../types/music';
import { Midi } from '@tonejs/midi';

/**
 * Parse a MIDI file (ArrayBuffer) into our Song format.
 */
export async function parseMidiFile(buffer: ArrayBuffer, fileName: string): Promise<Song> {
  const midi = new Midi(buffer);

  const tempoChange = midi.header.tempos[0];
  const bpm = tempoChange ? Math.round(tempoChange.bpm) : 120;

  const [numerator, denominator] = midi.header.timeSignatures[0]
    ? [
        midi.header.timeSignatures[0].timeSignature[0],
        midi.header.timeSignatures[0].timeSignature[1],
      ]
    : [4, 4];

  let totalDuration = 0;

  const tracks = midi.tracks
    .filter((t) => t.notes.length > 0)
    .map((t, idx) => {
      const hand: 'left' | 'right' = idx % 2 === 0 ? 'right' : 'left';
      const color = hand === 'right' ? '#6366f1' : '#ec4899';

      const notes = t.notes.map((n, nIdx) => {
        const end = n.time + n.duration;
        if (end > totalDuration) totalDuration = end;
        return {
          id: `t${idx}_n${nIdx}`,
          midi: n.midi,
          name: midiToName(n.midi),
          startTime: n.time,
          duration: n.duration,
          hand,
          velocity: Math.round(n.velocity * 127),
        };
      });

      return {
        id: `track-${idx}`,
        name: t.name || `Track ${idx + 1}`,
        hand,
        color,
        notes,
      };
    });

  const title = fileName.replace(/\.(mid|midi)$/i, '');

  return {
    id: `midi-${Date.now()}`,
    title,
    tempo: bpm,
    timeSignature: [numerator, denominator],
    totalDuration,
    tracks,
    sourceType: 'midi',
  };
}

/**
 * OMR pipeline that calls the Python backend.
 * Returns a Song or throws.
 */
export async function analyzeSheetImage(
  file: File,
  onProgress: (pct: number, stage: string) => void
): Promise<Song> {
  onProgress(5, 'Uploading image...');

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:8000/api/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to analyze sheet music');
    }

    onProgress(50, 'Processing with AI...');
    const song = await response.json();
    onProgress(100, 'Success!');
    return song;
  } catch (err) {
    console.error('OMR Error:', err);
    throw err;
  }
}
