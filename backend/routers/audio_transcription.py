from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import uuid
from backend.services.transcription_service import TranscriptionService
from backend.services.youtube_service import YouTubeService

router = APIRouter()
transcription_service = TranscriptionService()
yt_service = YouTubeService()

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

@router.post("/youtube")
async def transcribe_youtube(url: str = Form(...)):
    """Downloads and transcribes audio from a YouTube URL."""
    try:
        audio_path, title = yt_service.download_audio(url)
        # Process with AI
        song_data = await transcription_service.transcribe_audio(audio_path, title)
        
        # Cleanup
        if os.path.exists(audio_path):
            os.remove(audio_path)
            
        return song_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/youtube/search")
async def search_youtube(query: str = Form(...)):
    """Searches YouTube for videos."""
    try:
        results = yt_service.search_videos(query)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_status():
    return {"status": "AI Engine Online"}
