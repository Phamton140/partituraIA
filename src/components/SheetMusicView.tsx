import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Beam } from 'vexflow';
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
    context.setFillStyle('#000000');
    context.setStrokeStyle('#000000');
    context.setFont('Arial', 10, '');

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
      // Calculate rhythmic value based on duration and tempo
      const quarterTime = 60 / song.tempo;
      const beats = n.duration / quarterTime;
      
      let duration = 'q';
      if (beats <= 0.3) duration = '16';
      else if (beats <= 0.7) duration = '8';
      else if (beats >= 1.5) duration = 'h';
      
      const keys = [thisMidiToVexKey(n.midi)];
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

    try {
      // Create a voice in 4/4 and add notes
      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.setStrict(false); // Don't throw if measure is incomplete
      voice.addTickables(notes);

      // Format and justify the notes to 700 pixels.
      new Formatter().joinVoices([voice]).format([voice], 700);

      // Render voice
      voice.draw(context, stave);

      // --- Beam Logic ---
      const beamableDurations = ['8', '16', '32'];
      const beamGroups: StaveNote[][] = [];
      let currentGroup: StaveNote[] = [];

      notes.forEach((sn) => {
        const dur = sn.getDuration();
        if (beamableDurations.includes(dur)) {
          currentGroup.push(sn);
        } else {
          if (currentGroup.length > 1) {
            beamGroups.push([...currentGroup]);
          }
          currentGroup = [];
        }
      });
      if (currentGroup.length > 1) {
        beamGroups.push(currentGroup);
      }

      // Draw beams
      const beams = beamGroups.map(group => new Beam(group));
      beams.forEach(b => b.setContext(context).draw());

    } catch (err) {
      console.warn('VexFlow rendering error:', err);
    }

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
