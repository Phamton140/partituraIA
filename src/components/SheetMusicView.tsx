import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import type { Song, PlaybackState } from '../types/music';

interface SheetMusicViewProps {
  song: Song | null;
  playback: PlaybackState;
}

const SheetMusicView: React.FC<SheetMusicViewProps> = ({ song, playback }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !song) return;

    // Clear previous rendering
    containerRef.current.innerHTML = '';

    const div = containerRef.current;
    const renderer = new Renderer(div, Renderer.Backends.SVG);

    // Configure renderer
    renderer.resize(800, 200);
    const context = renderer.getContext();
    context.setFont('Arial', 10, '').setBackgroundFillStyle('#eed');

    // Create a stave at position 10, 40 on canvas, 700 pixels wide.
    const stave = new Stave(10, 40, 750);
    stave.addClef('treble').addTimeSignature(`${song.timeSignature[0]}/${song.timeSignature[1]}`);
    stave.setContext(context).draw();

    // Find notes near current time
    const activeNotes = song.tracks
      .filter(t => t.hand === 'right') // Focus on treble for now
      .flatMap(t => t.notes)
      .filter(n => n.startTime >= playback.currentTime - 2 && n.startTime <= playback.currentTime + 5)
      .slice(0, 4); // Limit for the single stave

    if (activeNotes.length === 0) return;

    const notes = activeNotes.map(n => {
      // Convert MIDI to VexFlow key format (e.g. 60 -> c/4)
      const keys = [thisMidiToVexKey(n.midi)];
      const duration = 'q'; // Assume quarter for now
      const sn = new StaveNote({ keys, duration });
      
      // Add accidentals if needed
      if (keys[0].includes('#')) {
        sn.addModifier(new Accidental('#'), 0);
      }
      
      // Highlight if active
      if (n.startTime <= playback.currentTime && n.startTime + n.duration > playback.currentTime) {
        sn.setStyle({ fillStyle: '#6366f1', strokeStyle: '#6366f1' });
      }

      return sn;
    });

    // Create a voice in 4/4 and add notes
    const voice = new Voice({ numBeats: 4, beatValue: 4 });
    voice.addTickables(notes);

    // Format and justify the notes to 700 pixels.
    new Formatter().joinVoices([voice]).format([voice], 700);

    // Render voice
    voice.draw(context, stave);

  }, [song, playback.currentTime]);

  function thisMidiToVexKey(midi: number): string {
    const notes = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
    const octave = Math.floor(midi / 12) - 1;
    const name = notes[midi % 12];
    return `${name}/${octave}`;
  }

  return (
    <div className="sheet-music-container">
      <div ref={containerRef} className="vex-container" />
    </div>
  );
};

export default SheetMusicView;
