from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from typing import List
import os
import uuid
from backend.services.omr_service import OMRService

router = APIRouter()
omr_service = OMRService()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/analyze")
async def analyze_sheet(file: UploadFile = File(...)):
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".pdf", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    # Save the file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Process the file
    try:
        # In a robust system, this might be a background task or a separate service
        # For now, we'll run it and return the result
        song_data = await omr_service.process_image(file_path, file.filename)
        return song_data
    except Exception as e:
        # Clean up on failure
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"OMR Processing failed: {str(e)}")
    finally:
        # Optionally delete the file after processing
        # if os.path.exists(file_path):
        #     os.remove(file_path)
        pass

@router.get("/status")
async def get_status():
    return {"status": "ready"}
