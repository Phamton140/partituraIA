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
        Advanced Heuristic Audio -> MIDI using Librosa.
        Detects onsets, pitches, and dynamic durations.
        """
        print("AI: Running ADVANCED Heuristic Fallback...")
        try:
            import librosa
            y, sr = librosa.load(audio_path)
            
            # 1. Onset detection (When notes start)
            onsets = librosa.onset.onset_detect(y=y, sr=sr, units='time', backtrack=True)
            if len(onsets) == 0:
                return self._build_empty_response(filename, "No se detectaron notas")

            # 2. Pitch detection (What notes are they)
            # Use YIN algorithm for more stable pitch detection in monophonic/clear audio
            f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
            times = librosa.times_like(f0)

            notes = []
            for i in range(len(onsets)):
                start_t = onsets[i]
                # End time is the next onset or the end of the file
                end_t = onsets[i+1] if i + 1 < len(onsets) else librosa.get_duration(y=y, sr=sr)
                duration = max(0.1, end_t - start_t)

                # Find the most frequent pitch in this time window
                mask = (times >= start_t) & (times < end_t)
                window_pitches = f0[mask]
                valid_pitches = window_pitches[~np.isnan(window_pitches)]
                
                if len(valid_pitches) > 0:
                    # Get median frequency and convert to MIDI
                    freq = np.median(valid_pitches)
                    midi = int(round(librosa.hz_to_midi(freq)))
                else:
                    # Fallback to a central note if detection fails
                    midi = 60 

                # 3. Velocity detection (How loud)
                # Calculate RMS energy in the window
                start_sample = int(start_t * sr)
                end_sample = int(end_t * sr)
                window_y = y[start_sample:end_sample]
                rms = np.sqrt(np.mean(window_y**2)) if len(window_y) > 0 else 0
                velocity = int(min(127, max(40, rms * 400))) # Scaled heuristic

                notes.append({
                    "id": f"h{i}",
                    "midi": midi,
                    "name": self._midi_to_name(midi),
                    "startTime": float(start_t),
                    "duration": float(duration),
                    "hand": "right" if midi >= 60 else "left",
                    "velocity": velocity
                })

            # Separate into tracks based on hand
            rh_notes = [n for n in notes if n["hand"] == "right"]
            lh_notes = [n for n in notes if n["hand"] == "left"]

            return {
                "id": str(uuid.uuid4())[:8],
                "title": f"{os.path.splitext(filename)[0]} (Transcripción IA)",
                "composer": "Heurística Avanzada",
                "tempo": 120,
                "timeSignature": [4, 4],
                "totalDuration": float(librosa.get_duration(y=y, sr=sr)),
                "sourceType": "audio",
                "tracks": [
                    {"id": "rh", "name": "Mano Derecha", "hand": "right", "color": "#6366f1", "notes": rh_notes},
                    {"id": "lh", "name": "Mano Izquierda", "hand": "left", "color": "#ec4899", "notes": lh_notes}
                ]
            }
        except Exception as e:
            print(f"AI ERROR: Advanced Fallback failed: {str(e)}")
            return self._build_empty_response(filename, str(e))

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

    def _build_empty_response(self, filename, reason):
        return {
            "id": "error", "title": f"Error: {reason}", "composer": "Sistema", "tempo": 120,
            "timeSignature": [4, 4], "totalDuration": 5, "tracks": []
        }

    def _midi_to_name(self, midi):
        notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        octave = (midi // 12) - 1
        return f"{notes[midi % 12]}{octave}"
