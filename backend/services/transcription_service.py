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
            print("AI WARNING: Basic Pitch not installed. Using SCALE-AWARE Heuristic.")
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

    def _load_audio_robustly(self, path, sr=22050):
        """Loads audio using PyAV as a robust backend for multiple formats on Windows."""
        try:
            import av
            import librosa
            
            container = av.open(path)
            stream = container.streams.audio[0]
            resampler = av.AudioResampler(format='s16', layout='mono', rate=sr)
            
            audio_frames = []
            for frame in container.decode(stream):
                resampled_frames = resampler.resample(frame)
                for f in resampled_frames:
                    audio_frames.append(np.frombuffer(f.to_ndarray(), dtype=np.int16))
            
            if not audio_frames:
                raise ValueError("No audio frames decoded")
                
            y = np.concatenate(audio_frames).astype(np.float32) / 32768.0
            return y, sr
        except Exception as e:
            print(f"AI WARNING: PyAV load failed: {str(e)}. Falling back to librosa default.")
            import librosa
            return librosa.load(path, sr=sr)

    async def _heuristic_transcription(self, audio_path, filename):
        """
        SCALE-AWARE Polyphonic Heuristic Audio -> MIDI.
        Uses PyAV for robust decoding on Windows.
        """
        print("AI: Running ROBUST SCALE-AWARE Heuristic...")
        try:
            import librosa
            # Load robustly using PyAV
            y, sr = self._load_audio_robustly(audio_path, sr=22050)
            
            # Harmonic/Percussive separation
            y_harmonic = librosa.effects.harmonic(y)
            
            # Key Detection
            chroma_global = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr).mean(axis=1)
            major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
            minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
            
            best_key, best_score, is_major = 0, -1, True
            for i in range(12):
                m_score = np.corrcoef(chroma_global, np.roll(major_profile, i))[0, 1]
                mi_score = np.corrcoef(chroma_global, np.roll(minor_profile, i))[0, 1]
                if m_score > best_score: best_score, best_key, is_major = m_score, i, True
                if mi_score > best_score: best_score, best_key, is_major = mi_score, i, False

            scale_intervals = [0, 2, 4, 5, 7, 9, 11] if is_major else [0, 2, 3, 5, 7, 8, 10]
            allowed_pcs = [(best_key + step) % 12 for step in scale_intervals]
            
            # Onset detection
            onset_env = librosa.onset.onset_strength(y=y_harmonic, sr=sr)
            onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units='time')
            if len(onsets) == 0: return self._build_empty_response(filename, "No se detectaron notas")

            chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr, hop_length=512)
            centroid = librosa.feature.spectral_centroid(y=y_harmonic, sr=sr, hop_length=512)[0]

            notes = []
            total_dur = len(y) / sr

            for i in range(len(onsets)):
                start_t = onsets[i]
                end_t = onsets[i+1] if i + 1 < len(onsets) else total_dur
                duration = max(0.1, end_t - start_t)
                frame = librosa.time_to_frames(start_t, sr=sr, hop_length=512)
                if frame >= chroma.shape[1]: continue

                chroma_frame = chroma[:, frame]
                avg_energy = np.mean(chroma_frame)
                threshold = max(0.4, avg_energy * 1.5)
                pitch_classes = np.where(chroma_frame > threshold)[0]

                avg_centroid = centroid[frame]
                base_octave = int(np.clip(np.log2(avg_centroid / 32.7) - 1, 2, 6))

                for pc in pitch_classes:
                    if pc not in allowed_pcs and chroma_frame[pc] < threshold * 1.8: continue
                    midi = (base_octave + 1) * 12 + pc
                    midi = max(21, min(108, midi))
                    notes.append({
                        "id": f"p{i}-{pc}", "midi": int(midi), "name": self._midi_to_name(midi),
                        "startTime": float(start_t), "duration": float(duration),
                        "hand": "right" if midi >= 55 else "left",
                        "velocity": int(min(127, max(40, chroma_frame[pc] * 110)))
                    })

            return {
                "id": str(uuid.uuid4())[:8], "title": f"{os.path.splitext(filename)[0]}",
                "composer": f"{self._midi_to_name(best_key+60)[:-1]} {'Maj' if is_major else 'Min'}",
                "tempo": 120, "timeSignature": [4, 4], "totalDuration": float(total_dur),
                "sourceType": "audio",
                "tracks": [
                    {"id": "rh", "name": "Derecha", "hand": "right", "color": "#6366f1", "notes": [n for n in notes if n["hand"] == "right"]},
                    {"id": "lh", "name": "Izquierda", "hand": "left", "color": "#ec4899", "notes": [n for n in notes if n["hand"] == "left"]}
                ]
            }
        except Exception as e:
            print(f"AI ERROR: Robust fallback failed: {str(e)}")
            return self._build_empty_response(filename, str(e))

    def _midi_to_song_json(self, midi_data, filename):
        import importlib
        try:
            pretty_midi = importlib.import_module('pretty_midi')
        except: pass
        title = os.path.splitext(filename)[0]
        song_id = str(uuid.uuid4())[:8]
        rh_notes, lh_notes = [], []
        for instrument in midi_data.instruments:
            for note in instrument.notes:
                p_note = {
                    "id": str(uuid.uuid4())[:8], "midi": int(note.pitch), "name": self._midi_to_name(note.pitch),
                    "startTime": float(note.start), "duration": float(note.end - note.start), "velocity": int(note.velocity),
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
        return {
            "id": "error", "title": f"Fallo: {reason}", "timeSignature": [4, 4], 
            "tempo": 120, "totalDuration": 0, "tracks": []
        }

    def _midi_to_name(self, midi):
        notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        octave = (midi // 12) - 1
        return f"{notes[midi % 12]}{octave}"
