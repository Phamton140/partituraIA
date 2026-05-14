import os
import uuid
import asyncio
import numpy as np

class TranscriptionService:
    def __init__(self):
        self.engine_ready = False
        try:
            import importlib
            bp_inference = importlib.import_module('basic_pitch.inference')
            bp_main = importlib.import_module('basic_pitch')
            self.predict = bp_inference.predict
            self.model_path = bp_main.ICASSP_2022_MODEL_PATH
            self.engine_ready = True
            print("AI: Basic Pitch Engine Loaded Successfully.")
        except (ImportError, ModuleNotFoundError):
            print("AI WARNING: Basic Pitch not installed. Using Heuristic Fallback.")
            self.predict = None

    async def transcribe_audio(self, audio_path: str, original_filename: str):
        print(f"AI: Transcribing {original_filename}...")
        
        if not self.engine_ready:
            # If AI engine is not available, we use a heuristic or return an informative error
            # For now, let's try a "Simulated AI" that detects basic features if librosa is available
            return await self._heuristic_transcription(audio_path, original_filename)

        loop = asyncio.get_event_loop()
        try:
            midi_data = await loop.run_in_executor(None, self._run_inference, audio_path)
            return self._midi_to_song_json(midi_data, original_filename)
        except Exception as e:
            print(f"AI ERROR: Inference failed: {str(e)}")
            return await self._heuristic_transcription(audio_path, original_filename)

    def _run_inference(self, audio_path):
        _, midi_data, _ = self.predict(audio_path)
        return midi_data

    async def _heuristic_transcription(self, audio_path, filename):
        """
        Fallback when high-end AI is not available.
        Uses librosa for onset detection or simple audio analysis.
        """
        print("AI: Running Heuristic Fallback...")
        try:
            import librosa
            # Simple onset detection to at least show 'something' is happening
            y, sr = librosa.load(audio_path)
            onsets = librosa.onset.onset_detect(y=y, sr=sr, units='time')
            
            # Create a very simple rhythmic pattern based on onsets
            notes = []
            for i, start_t in enumerate(onsets):
                notes.append({
                    "id": f"h{i}",
                    "midi": 60 + (i % 12), # Dummy melody
                    "name": self._midi_to_name(60 + (i % 12)),
                    "startTime": float(start_t),
                    "duration": 0.5,
                    "hand": "right",
                    "velocity": 80
                })
            
            return {
                "id": str(uuid.uuid4())[:8],
                "title": f"{os.path.splitext(filename)[0]} (Heuristic)",
                "composer": "AI Heuristic",
                "tempo": 120,
                "timeSignature": [4, 4],
                "totalDuration": float(librosa.get_duration(y=y, sr=sr)),
                "sourceType": "audio",
                "tracks": [{"id": "h1", "name": "Detección Rítmica", "hand": "right", "color": "#6366f1", "notes": notes}]
            }
        except Exception as e:
            print(f"AI ERROR: Fallback failed: {str(e)}")
            # Last resort: informative error song
            return {
                "id": "error",
                "title": "Error de Configuración IA",
                "composer": "Sistema",
                "tempo": 120,
                "timeSignature": [4, 4],
                "totalDuration": 5,
                "tracks": [{
                    "id": "err", "name": "Error", "hand": "right", "notes": [
                        {"id": "e1", "midi": 60, "name": "C4", "startTime": 0, "duration": 4, "hand": "right", "velocity": 0}
                    ]
                }]
            }

    def _midi_to_song_json(self, midi_data, filename):
        try:
            import importlib
            pretty_midi = importlib.import_module('pretty_midi')
        except (ImportError, ModuleNotFoundError):
            print("AI WARNING: pretty_midi not found. Basic Pitch output might fail.")
        title = os.path.splitext(filename)[0]
        song_id = str(uuid.uuid4())[:8]
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
                if note.pitch >= 60:
                    p_note["hand"] = "right"
                    rh_notes.append(p_note)
                else:
                    p_note["hand"] = "left"
                    lh_notes.append(p_note)

        rh_notes.sort(key=lambda x: x["startTime"])
        lh_notes.sort(key=lambda x: x["startTime"])

        return {
            "id": song_id, "title": title, "composer": "AI Transcribed", "tempo": 120,
            "timeSignature": [4, 4], "totalDuration": float(midi_data.get_total_time()),
            "sourceType": "audio",
            "tracks": [
                {"id": f"{song_id}-rh", "name": "Mano Derecha (IA)", "hand": "right", "color": "#6366f1", "notes": rh_notes},
                {"id": f"{song_id}-lh", "name": "Mano Izquierda (IA)", "hand": "left", "color": "#ec4899", "notes": lh_notes}
            ]
        }

    def _midi_to_name(self, midi):
        notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        octave = (midi // 12) - 1
        return f"{notes[midi % 12]}{octave}"
