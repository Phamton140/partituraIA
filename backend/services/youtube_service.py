import os
import yt_dlp
import uuid

class YouTubeService:
    def __init__(self, download_path="temp"):
        self.download_path = download_path
        if not os.path.exists(self.download_path):
            os.makedirs(self.download_path)

    def download_audio(self, url: str):
        """Downloads audio from a YouTube URL preferring m4a format."""
        file_id = str(uuid.uuid4())[:8]
        # Prefer m4a which is often more compatible with Windows audio decoders
        out_template = os.path.join(self.download_path, f"{file_id}.%(ext)s")
        
        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio/best', # Prefer m4a
            'outtmpl': out_template,
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            ext = info.get('ext', 'm4a')
            filename = os.path.join(self.download_path, f"{file_id}.{ext}")
            return filename, info.get('title', 'YouTube Song')
