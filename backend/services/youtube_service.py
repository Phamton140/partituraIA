import os
import yt_dlp
import uuid

class YouTubeService:
    def __init__(self, download_path="temp"):
        self.download_path = download_path
        if not os.path.exists(self.download_path):
            os.makedirs(self.download_path)

    def download_audio(self, url: str):
        """Downloads audio from a YouTube URL without requiring ffmpeg."""
        file_id = str(uuid.uuid4())[:8]
        # We don't use postprocessors (no ffmpeg needed)
        # We just download the best audio available
        out_template = os.path.join(self.download_path, f"{file_id}.%(ext)s")
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': out_template,
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            # Find the actual downloaded file (extension might be webm, m4a, etc.)
            ext = info.get('ext', 'webm')
            filename = os.path.join(self.download_path, f"{file_id}.{ext}")
            return filename, info.get('title', 'YouTube Song')
