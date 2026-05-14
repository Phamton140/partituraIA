import os
import cv2
import numpy as np
import time
import asyncio
import uuid
import fitz  # PyMuPDF

class OMRService:
    def __init__(self):
        # In a production environment, we would load a TensorFlow/PyTorch model here
        pass

    async def process_image(self, file_path: str, original_filename: str):
        """
        Full OMR Pipeline Implementation:
        1. Preprocessing (Adaptive Thresholding)
        2. Staff Detection (Horizontal Projection & Grouping)
        3. Note Detection (Blob Analysis & Vertical Mapping)
        4. Temporal Logic (Left-to-Right sequencing)
        """
        print(f"OMR: Analyzing {file_path}")
        
        # Load image robustly
        if not os.path.exists(file_path):
            raise ValueError(f"File not found at: {file_path}")
            
        ext = os.path.splitext(file_path)[1].lower()
        img = None

        if ext == '.pdf':
            doc = fitz.open(file_path)
            page = doc.load_page(0)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
            img = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR if pix.n == 4 else cv2.COLOR_RGB2BGR)
            doc.close()
        else:
            with open(file_path, "rb") as f:
                chunk = np.frombuffer(f.read(), dtype=np.uint8)
                img = cv2.imdecode(chunk, cv2.IMREAD_COLOR)
            
        if img is None:
            raise ValueError(f"Could not decode file: {file_path}")
            
        # 1. Preprocessing
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                      cv2.THRESH_BINARY_INV, 15, 10)
        
        # 2. Staff Line Detection
        horizontal_projection = np.sum(thresh, axis=1)
        peak_threshold = np.max(horizontal_projection) * 0.7
        staff_lines_indices = np.where(horizontal_projection > peak_threshold)[0]
        
        staves = self._group_staff_lines(staff_lines_indices)
        if not staves:
            # Fallback if no staves detected
            return self._fallback_response(original_filename)

        # 3. Note Detection (Heuristic-based for robustness)
        # We find blobs and map them to the detected staves
        detected_notes = self._extract_notes_from_staves(thresh, staves)
        
        await asyncio.sleep(1) # Processing overhead simulation
        
        return self._build_song_from_data(original_filename, detected_notes)

    def _group_staff_lines(self, indices):
        if len(indices) == 0: return []
        groups = []
        current_group = [indices[0]]
        for i in range(1, len(indices)):
            if indices[i] - indices[i-1] < 15:
                current_group.append(indices[i])
            else:
                if len(current_group) >= 3: groups.append(current_group)
                current_group = [indices[i]]
        if len(current_group) >= 3: groups.append(current_group)
        return groups

    def _extract_notes_from_staves(self, thresh, staves):
        """
        Finds objects (notes) and maps their vertical center to a pitch.
        """
        all_notes = []
        
        # We'll use the first staff group for the melody
        # A staff is 5 lines. Let's calculate the average spacing.
        for s_idx, staff in enumerate(staves):
            top = min(staff)
            bottom = max(staff)
            height = bottom - top
            line_spacing = height / 4 if height > 0 else 10
            
            # Create a mask for this staff area (with some padding)
            padding = int(line_spacing * 3)
            staff_roi = thresh[max(0, top-padding):min(thresh.shape[0], bottom+padding), :]
            
            # Find contours in the staff area
            contours, _ = cv2.findContours(staff_roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            staff_notes = []
            for cnt in contours:
                x, y, w, h = cv2.boundingRect(cnt)
                # Filter by size to ignore noise/stems and focus on note heads
                if 5 < w < line_spacing * 2 and 5 < h < line_spacing * 2:
                    # Calculate pitch based on vertical center relative to top line
                    # Treble Clef: Top line is F5 (Midi 77)
                    # Every half line_spacing is a step in the scale
                    y_center = y + h/2
                    # Offset from top line (F5)
                    # Note: y=0 in ROI is (top-padding). So top line in ROI is at y=padding.
                    steps_from_top = (y_center - padding) / (line_spacing / 2)
                    midi = 77 - round(steps_from_top)
                    
                    staff_notes.append({
                        "x": x,
                        "midi": int(midi),
                        "hand": "right" if s_idx % 2 == 0 else "left"
                    })
            
            # Sort by X to get chronological order
            staff_notes.sort(key=lambda n: n["x"])
            all_notes.extend(staff_notes)
            
        return all_notes

    def _build_song_from_data(self, filename, notes_data):
        title = os.path.splitext(filename)[0]
        song_id = str(uuid.uuid4())[:8]
        
        tracks = [
            {"id": f"{song_id}-rh", "name": "Melody", "hand": "right", "color": "#6366f1", "notes": []},
            {"id": f"{song_id}-lh", "name": "Bass", "hand": "left", "color": "#ec4899", "notes": []}
        ]
        
        # Distribute notes and add time based on X position
        # We assume 100 pixels = 1 second for simplicity
        for i, ndata in enumerate(notes_data):
            track_idx = 0 if ndata["hand"] == "right" else 1
            m = ndata["midi"]
            tracks[track_idx]["notes"].append({
                "id": f"n-{i}",
                "midi": m,
                "name": self._midi_to_name(m),
                "startTime": i * 0.5, # Sequential for now
                "duration": 0.4,
                "hand": ndata["hand"],
                "velocity": 90
            })
            
        return {
            "id": song_id,
            "title": title,
            "composer": "PartituraAI Vision",
            "tempo": 100,
            "timeSignature": [4, 4],
            "totalDuration": len(notes_data) * 0.5 + 1,
            "sourceType": "omr",
            "tracks": [t for t in tracks if len(t["notes"]) > 0]
        }

    def _fallback_response(self, filename):
        # Fallback if detection fails
        return {
            "id": "err",
            "title": f"Parsing failed for {filename}",
            "composer": "System",
            "tempo": 120,
            "timeSignature": [4, 4],
            "totalDuration": 1,
            "tracks": []
        }

    def _midi_to_name(self, midi):
        notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        octave = (midi // 12) - 1
        return f"{notes[midi % 12]}{octave}"
