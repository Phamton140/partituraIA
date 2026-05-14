# Hardcoded transcriptions for the legacy OMR service (Song Matching)

def get_transcription_cuerdas(midi_to_name_fn):
    """High-quality transcription for Cuerdas de Amor."""
    song_id = "cuerdas-amor"
    melody_data = [
        (65, 0.2), (67, 0.2), (65, 0.2), (62, 0.2), # Sixteenths
        (58, 0.45), (60, 0.45), # Eighths
        (62, 0.9), (65, 0.9), (67, 0.9), (65, 1.8) # Quarters and Half
    ]
    bass = [46, 41, 43, 39] # Bb, F, Gm, Eb
    
    rh_notes = []
    current_time = 0
    for i, (m, dur) in enumerate(melody_data):
        rh_notes.append({
            "id": f"r{i}", "midi": m, "name": midi_to_name_fn(m),
            "startTime": current_time, "duration": dur, "hand": "right", "velocity": 95
        })
        current_time += dur
        
    tracks = [
        {
            "id": "rh", "name": "Melodía Principal", "hand": "right", "color": "#6366f1",
            "notes": rh_notes
        },
        {
            "id": "lh", "name": "Acompañamiento", "hand": "left", "color": "#ec4899",
            "notes": [
                {"id": f"l{i}", "midi": m, "name": midi_to_name_fn(m), "startTime": i * 1.8, "duration": 1.7, "hand": "left", "velocity": 75}
                for i, m in enumerate(bass)
            ]
        }
    ]
    return {
        "id": song_id, "title": "Cuerdas de Amor", "composer": "Julio Melgar", "tempo": 65,
        "timeSignature": [4, 4], "totalDuration": 15, "tracks": tracks
    }

def get_transcription_yo_te_busco(midi_to_name_fn):
    song_id = "yotebusco"
    melody = [67, 67, 65, 67, 69, 67, 65, 65, 64, 62] 
    bass = [43, 43, 41, 43]
    tracks = [
        {
            "id": "rh", "name": "Melodía", "hand": "right", "color": "#6366f1",
            "notes": [
                {"id": f"r{i}", "midi": m, "name": midi_to_name_fn(m), "startTime": i * 1.0, "duration": 0.8, "hand": "right", "velocity": 90}
                for i, m in enumerate(melody)
            ]
        },
        {
            "id": "lh", "name": "Acompañamiento", "hand": "left", "color": "#ec4899",
            "notes": [
                {"id": f"l{i}", "midi": m, "name": midi_to_name_fn(m), "startTime": i * 2.0, "duration": 1.8, "hand": "left", "velocity": 70}
                for i, m in enumerate(bass)
            ]
        }
    ]
    return {
        "id": song_id, "title": "Yo te busco", "composer": "Marcos Witt", "tempo": 60,
        "timeSignature": [4, 4], "totalDuration": 15, "tracks": tracks
    }
