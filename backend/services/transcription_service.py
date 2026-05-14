import os
import uuid
import asyncio
import numpy as np
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH
import pretty_midi

class TranscriptionService:
    def __init__(self):
        self.model_path = ICASSP_2022_MODEL_PATH

    async def transcribe_audio(self, audio_path: str, original_filename: str):
        """
        AI Audio -> MIDI Pipeline:
        1. Basic Pitch Inference (Audio to MIDI objects)
        2. MIDI Processing & Hand Separation
        3. Conversion to PartituraAI JSON format
        """
        print(f"AI: Transcribing {audio_path}...")
        
        # This is a CPU intensive task, running in a thread to not block event loop
        loop = asyncio.get_event_loop()
        midi_data = await loop.run_in_executor(None, self._run_inference, audio_path)
        
        return self._midi_to_song_json(midi_data, original_filename)

    def _run_inference(self, audio_path):
        # basic-pitch predict returns (model_output, midi_data, note_events)
        _, midi_data, _ = predict(audio_path)
        return midi_data

    def _midi_to_song_json(self, midi_data, filename):
        title = os.path.splitext(filename)[0]
        song_id = str(uuid.uuid4())[:8]
        
        # Spotify's basic-pitch returns a pretty_midi object
        # We need to separate hands based on pitch (Split Point C4 = 60)
        rh_notes = []
        lh_notes = []
        
        for instrument in midi_data.instruments:
            for note in instrument.notes:
                p_note = {
                    "id": str(uuid.uuid4())[:8],
                    "midi": int(note.pitch),
                    "name": self._midi_to_name(note.pitch),
                    "startTime": float(note.start),
                    "duration": float(note.end - note.start),
                    "velocity": int(note.velocity),
                }
                
                # Simple Split Point Logic (Improved in future with clustering)
                if note.pitch >= 60:
                    p_note["hand"] = "right"
                    rh_notes.append(p_note)
                else:
                    p_note["hand"] = "left"
                    lh_notes.append(p_note)

        # Sort notes by startTime
        rh_notes.sort(key=lambda x: x["startTime"])
        lh_notes.sort(key=lambda x: x["startTime"])

        return {
            "id": song_id,
            "title": title,
            "composer": "AI Transcribed",
            "tempo": 120, # Default, can be detected later
            "timeSignature": [4, 4],
            "totalDuration": float(midi_data.get_total_time()),
            "sourceType": "audio",
            "tracks": [
                {
                    "id": f"{song_id}-rh",
                    "name": "Mano Derecha (IA)",
                    "hand": "right",
                    "color": "#6366f1",
                    "notes": rh_notes
                },
                {
                    "id": f"{song_id}-lh",
                    "name": "Mano Izquierda (IA)",
                    "hand": "left",
                    "color": "#ec4899",
                    "notes": lh_notes
                }
            ]
        }

    def _midi_to_name(self, midi):
        notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        octave = (midi // 12) - 1
        return f"{notes[midi % 12]}{octave}"
