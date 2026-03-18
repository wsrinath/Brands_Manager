from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import yt_dlp
import traceback

app = FastAPI()

# Configure CORS so frontend can fetch directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/views")
async def get_views(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="Missing url parameter")
    
    view_count = 0
    title = 'Unknown'
    
    # Attempt 1: yt-dlp (FIXED: removed extract_flat which skips view_count)
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'simulate': True,
            'verbose': True,
            'skip_download': True,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
            },
            'nocheckcertificate': True,
            'http_opts': {
                'verify': False
            },
            'socket_timeout': 15,
            # Add retries and slight delay
            'retries': 2,
            'fragment_retries': 2,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"[yt-dlp] Attempting to extract info for URL: {url}")
            info_dict = ydl.extract_info(url, download=False)
            if info_dict:
                print(f"[yt-dlp] Raw info_dict obtained: {info_dict.get('view_count')}, entries: {info_dict.get('entries') is not None}")
                vc = info_dict.get('view_count')
                print(f"[yt-dlp] Initial view_count (vc): {vc}")
                # For playlists / entries fall back to first entry
                if vc is None and 'entries' in info_dict:
                    print(f"[yt-dlp] 'view_count' is None, checking entries...")
                    entries = info_dict.get('entries') or []
                    if entries:
                        vc = entries[0].get('view_count', 0)
                        print(f"[yt-dlp] View count from first entry: {vc}")
                if vc is not None:
                    view_count = int(vc)
                    print(f"[yt-dlp] Final view_count after conversion: {view_count}")
                title = info_dict.get('title', 'Unknown')
                print(f"[yt-dlp] Success for {url}: view_count={view_count}, title={title}")
    except Exception as e:
        print(f"[yt-dlp] Failed for {url}: {e}")
        traceback.print_exc()
        
    # Attempt 2: FALLBACK HTML Scraping (only for YouTube, since FB/TT are JS-rendered)
    # Note: This fallback ONLY works reliably for YouTube. Facebook and TikTok pages
    # are JavaScript-rendered and their view counts won't appear in raw HTML.
    # For FB/TT, yt-dlp is the only practical option from a server-side Python script.
    if not view_count:
        import urllib.request
        import re
        try:
            print(f"[HTML Scraper] Attempting to fetch URL via urllib: {url}")
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                }
            )
            html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
            print(f"[HTML Scraper] Fetched HTML content length: {len(html)} characters")

            if 'youtube.com' in url or 'youtu.be' in url:
                print(f"[HTML Scraper] Detected YouTube URL. Trying regex patterns...")
                # YouTube embeds view count in its initial page data JSON
                match = re.search(r'"viewCount"\s*:\s*"(\d+)"', html)
                if not match:
                    print(f"[HTML Scraper] YouTube regex 1 failed. Trying regex 2...")
                    match = re.search(r'itemprop="interactionCount"\s+content="(\d+)"', html)
                if not match:
                    print(f"[HTML Scraper] YouTube regex 2 failed. Trying regex 3...")
                    # Another common pattern in YouTube's ytInitialData
                    match = re.search(r'"viewCount":"(\d+)"', html)
                if match:
                    view_count = int(match.group(1))
                    print(f"[HTML Scraper] YouTube view count found: {view_count}")
                else:
                    print(f"[HTML Scraper] Could not find viewCount in YouTube HTML for {url}")

            elif 'facebook.com' in url:
                print(f"[HTML Scraper] Detected Facebook URL. Trying regex patterns...")
                # Facebook is JS-rendered — regex rarely works here.
                # Attempt anyway as a last resort.
                match = re.search(r'"play_count"\s*:\s*(\d+)', html)
                if not match:
                    print(f"[HTML Scraper] Facebook regex 1 failed. Trying regex 2...")
                    match = re.search(r'"video_view_count"\s*:\s*(\d+)', html)
                if not match:
                    print(f"[HTML Scraper] Facebook regex 2 failed. Trying regex 3...")
                    match = re.search(r'"playCount"\s*:\s*(\d+)', html)
                if match:
                    view_count = int(match.group(1))
                    print(f"[HTML Scraper] Facebook view count found: {view_count}")
                else:
                    print(f"[HTML Scraper] Facebook page is JS-rendered, could not find view count for {url}")

            elif 'tiktok.com' in url:
                print(f"[HTML Scraper] Detected TikTok URL. Trying regex patterns...")
                # TikTok is JS-rendered — regex rarely works here.
                match = re.search(r'"playCount"\s*:\s*(\d+)', html)
                if not match:
                    print(f"[HTML Scraper] TikTok regex 1 failed. Trying regex 2...")
                    match = re.search(r'"viewCount"\s*:\s*(\d+)', html)
                if not match:
                    print(f"[HTML Scraper] TikTok regex 2 failed. Trying regex 3...")
                    # TikTok sometimes puts it in SIGI_STATE JSON blob
                    match = re.search(r'"play_count"\s*:\s*(\d+)', html)
                if match:
                    view_count = int(match.group(1))
                    print(f"[HTML Scraper] TikTok view count found: {view_count}")
                else:
                    print(f"[HTML Scraper] TikTok page is JS-rendered, could not find view count for {url}")

        except Exception as ex:
            print(f"[HTML Scraper] Failed for {url}: {ex}")

    print(f"[Final] view_count={view_count} for url={url}")

    # Return 200 with count 0 if both methods fail — frontend saves 0 gracefully
    return {
        "view_count": view_count,
        "url": url,
        "title": title
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
