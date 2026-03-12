from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import traceback

app = FastAPI()

# Configure CORS so Editor.jsx can fetch directly without proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity (or restrict to your production URL)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

@app.get("/views")
async def get_views(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="Missing url parameter")
    
    view_count = 0
    title = 'Unknown'
    
    # Attempt 1: yt-dlp
    try:
        ydl_opts = {
            'quiet': True,
            'extract_flat': True,
            'no_warnings': True,
            'simulate': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            vc = info_dict.get('view_count')
            if vc is None and 'entries' in info_dict and len(info_dict['entries']) > 0:
                vc = info_dict['entries'][0].get('view_count', 0)
            if vc is not None:
                view_count = vc
            title = info_dict.get('title', 'Unknown')
    except Exception as e:
        print(f"yt-dlp failed for {url}: {e}")
        
    # Attempt 2: FALLBACK HTML Scraping
    if not view_count:
        import urllib.request
        import re
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'})
            html = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
            if 'youtube.com' in url or 'youtu.be' in url:
                match = re.search(r'"viewCount":"(\d+)"', html)
                if not match: match = re.search(r'itemprop="interactionCount" content="(\d+)"', html)
                if match: view_count = int(match.group(1))
            elif 'facebook.com' in url:
                match = re.search(r'"play_count":(\d+)', html)
                if not match: match = re.search(r'"video_view_count":(\d+)', html)
                if match: view_count = int(match.group(1))
            elif 'tiktok.com' in url:
                match = re.search(r'"playCount":(\d+)', html)
                if not match: match = re.search(r'"viewCount":(\d+)', html)
                if match: view_count = int(match.group(1))
        except Exception as ex:
            print(f"Fallback scraper failed for {url}: {ex}")

    # We return 200 with count 0 if both fail, so the frontend gracefully saves '0' and doesn't abort
    return {
        "view_count": view_count, 
        "url": url,
        "title": title
    }
