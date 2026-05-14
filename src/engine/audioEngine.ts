import * as Tone from 'tone';
import type { Song, MusicNote } from '../types/music';

// Sampler using Tone.js built-in samples
let sampler: Tone.Sampler | null = null;
let isReady = false;

export async function initAudio(): Promise<void> {
  if (sampler && isReady) return;

  await Tone.start();

  sampler = new Tone.Sampler({
    urls: {
      A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
      A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
      A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
      A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
      A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
      A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
      A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
      A7: 'A7.mp3', C8: 'C8.mp3',
    },
    release: 1,
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    onload: () => { isReady = true; },
  }).toDestination();

  // Wait for load
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (isReady) { clearInterval(check); resolve(); }
    }, 100);
    setTimeout(() => { clearInterval(check); resolve(); }, 5000);
  });
}

export function playNote(noteName: string, duration: number, velocity = 0.8): void {
  if (!sampler || !isReady) return;
  const vol = velocity / 127;
  sampler.triggerAttackRelease(noteName, duration, Tone.now(), vol);
}

export function scheduleNote(note: MusicNote, startOffset: number, speed: number): void {
  if (!sampler || !isReady) return;
  const when = Tone.now() + (note.startTime - startOffset) / speed;
  if (when < Tone.now()) return;
  const vol = note.velocity / 127;
  const dur = note.duration / speed;
  sampler.triggerAttackRelease(note.name, dur, when, vol);
}

export function scheduleSong(
  song: Song,
  startOffset: number,
  speed: number,
  activeHands: Set<string>
): Tone.Part | null {
  if (!sampler || !isReady) return null;

  const events: Array<{ time: number; note: MusicNote }> = [];

  for (const track of song.tracks) {
    if (!activeHands.has(track.hand) && !activeHands.has('both')) continue;
    for (const note of track.notes) {
      if (note.startTime >= startOffset) {
        events.push({ time: (note.startTime - startOffset) / speed, note });
      }
    }
  }

  if (events.length === 0) return null;

  const part = new Tone.Part((time, event: { time: number; note: MusicNote }) => {
    const vol = event.note.velocity / 127;
    const dur = event.note.duration / speed;
    sampler!.triggerAttackRelease(event.note.name, dur, time, vol);
  }, events.map(e => [e.time, e]));

  part.start(0);
  Tone.getTransport().start();
  return part;
}

export function stopAll(): void {
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  sampler?.releaseAll();
}

export function isAudioReady(): boolean {
  return isReady;
}
