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
            print("AI WARNING: Basic Pitch not installed. Using POLYPHONIC Heuristic.")
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
        POLYPHONIC Heuristic Audio -> MIDI using Librosa Chromagram.
        Now detects chords and multiple simultaneous notes.
        """
        print("AI: Running POLYPHONIC Heuristic...")
        try:
            import librosa
            y, sr = librosa.load(audio_path, sr=22050)
            
            # Limit duration for speed
            duration_limit = 300
            if len(y) > duration_limit * sr:
                y = y[:duration_limit * sr]

            # 1. Onset detection
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units='time')
            
            if len(onsets) == 0:
                return self._build_empty_response(filename, "No se detectó sonido claro")

            # 2. Chromagram for Chord detection
            # Chroma represents the 12 pitch classes (C, C#, D...)
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512)
            
            # 3. Spectral Centroid to determine the Octave
            # (Chroma tells us 'C', Centroid tells us 'C4' vs 'C2')
            centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=512)[0]

            notes = []
            total_dur = librosa.get_duration(y=y, sr=sr)

            for i in range(len(onsets)):
                start_t = onsets[i]
                end_t = onsets[i+1] if i + 1 < len(onsets) else total_dur
                duration = max(0.1, end_t - start_t)

                frame = librosa.time_to_frames(start_t, sr=sr, hop_length=512)
                if frame >= chroma.shape[1]: continue

                # Get the 12-note profile for this moment
                chroma_frame = chroma[:, frame]
                
                # Threshold to detect multiple notes (Acordes)
                # We pick peaks in the chromagram
                # Thresholding at 60% of the maximum peak in this frame
                threshold = np.max(chroma_frame) * 0.6
                pitch_classes = np.where(chroma_frame > threshold)[0]

                # Determine base octave based on spectral centroid
                # Heuristic: centroid 1000Hz ~ C5, 500Hz ~ C4, 250Hz ~ C3
                avg_centroid = centroid[frame]
                base_octave = int(np.clip(np.log2(avg_centroid / 32.7) - 1, 2, 6))

                # For each detected pitch class, add a note
                for pc in pitch_classes:
                    midi = (base_octave + 1) * 12 + pc
                    
                    # Sanity check for MIDI range
                    midi = max(21, min(108, midi))

                    notes.append({
                        "id": f"p{i}-{pc}",
                        "midi": int(midi),
                        "name": self._midi_to_name(midi),
                        "startTime": float(start_t),
                        "duration": float(duration),
                        "hand": "right" if midi >= 55 else "left", # Split at G3
                        "velocity": int(min(127, max(40, chroma_frame[pc] * 100)))
                    })

            # Separate and return
            rh_notes = [n for n in notes if n["hand"] == "right"]
            lh_notes = [n for n in notes if n["hand"] == "left"]

            return {
                "id": str(uuid.uuid4())[:8],
                "title": f"{os.path.splitext(filename)[0]} (IA Polifónica)",
                "composer": "Poly-Heuristic",
                "tempo": 120,
                "timeSignature": [4, 4],
                "totalDuration": float(total_dur),
                "sourceType": "audio",
                "tracks": [
                    {"id": "rh", "name": "Derecha", "hand": "right", "color": "#6366f1", "notes": rh_notes},
                    {"id": "lh", "name": "Izquierda", "hand": "left", "color": "#ec4899", "notes": lh_notes}
                ]
            }
        except Exception as e:
            print(f"AI ERROR: Polyphonic failed: {str(e)}")
            return self._build_empty_response(filename, str(e))

    def _midi_to_song_json(self, midi_data, filename):
        import importlib
        try:
            pretty_midi = importlib.import_module('pretty_midi')
        except:
            pass
            
        title = os.path.splitext(filename)[0]
        song_id = str(uuid.uuid4())[:8]
        rh_notes, lh_notes = [], []
        
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

        return {
            "id": song_id, "title": title, "composer": "AI", "tempo": 120,
            "timeSignature": [4, 4], "totalDuration": float(midi_data.get_total_time()),
            "sourceType": "audio",
            "tracks": [
                {"id": "rh", "name": "Derecha", "hand": "right", "color": "#6366f1", "notes": rh_notes},
                {"id": "lh", "name": "Izquierda", "hand": "left", "color": "#ec4899", "notes": lh_notes}
            ]
        }

    def _build_empty_response(self, filename, reason):
        return {"id": "error", "title": f"Error: {reason}", "tracks": []}

    def _midi_to_name(self, midi):
        notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        octave = (midi // 12) - 1
        return f"{notes[midi % 12]}{octave}"
