from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import uuid
from backend.services.transcription_service import TranscriptionService

router = APIRouter()
transcription_service = TranscriptionService()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    allowed_extensions = {".mp3", ".wav", ".flac", ".m4a"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported audio format: {ext}")

    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio: {str(e)}")

    try:
        # AI Processing
        song_data = await transcription_service.transcribe_audio(file_path, file.filename)
        return song_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Transcription failed: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@router.get("/status")
async def get_status():
    return {"status": "AI Engine Online"}
