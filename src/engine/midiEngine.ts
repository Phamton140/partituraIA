import { useMusicStore } from '../store/useMusicStore';
import { playNote } from './audioEngine';

export async function initMidi() {
  if (!navigator.requestMIDIAccess) {
    console.warn('Web MIDI API not supported in this browser.');
    return;
  }

  try {
    const midiAccess = await navigator.requestMIDIAccess();
    const inputs = midiAccess.inputs.values();

    for (const input of inputs) {
      input.onmidimessage = handleMidiMessage;
      console.log(`MIDI Input connected: ${input.name}`);
    }

    midiAccess.onstatechange = (e) => {
      if (e.port.type === 'input' && e.port.state === 'connected') {
        (e.port as WebMidi.MIDIInput).onmidimessage = handleMidiMessage;
      }
    };
  } catch (err) {
    console.error('Failed to access MIDI devices:', err);
  }
}

function handleMidiMessage(message: WebMidi.MIDIMessageEvent) {
  const [status, data1, data2] = message.data;
  const type = status & 0xf0;
  const note = data1;
  const velocity = data2;

  const setPlayback = useMusicStore.getState().setPlayback;

  if (type === 144 && velocity > 0) { // Note On
    // Trigger sound for local feedback if desired, or just light up keys
    // We update the store with the currently "pressed" key by the user
    updateUserKeyPress(note, true);
  } else if (type === 128 || (type === 144 && velocity === 0)) { // Note Off
    updateUserKeyPress(note, false);
  }
}

// Internal state for user-pressed keys to avoid store spam
const pressedKeys = new Set<number>();

function updateUserKeyPress(midi: number, isPressed: boolean) {
  if (isPressed) pressedKeys.add(midi);
  else pressedKeys.delete(midi);

  // We add this to a separate "userNotes" set in the music store
  // (We need to add this property to the store first)
  const setPlayback = useMusicStore.getState().setPlayback;
  setPlayback((prev: any) => ({
    ...prev,
    userPressedKeys: new Set(pressedKeys)
  }));
}
