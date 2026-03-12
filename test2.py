import urllib.request
import re

urls = [
    'https://youtu.be/a0gAME7rhKw',
    'https://www.facebook.com/share/v/16vLzBvG1w/',
    'https://www.tiktok.com/@hirunews/video/7327310065757785346'
]

for url in urls:
    print(f"Testing {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'})
        html = urllib.request.urlopen(req, timeout=5).read().decode('utf-8', errors='ignore')
        
        view_count = None
        if 'youtube.com' in url or 'youtu.be' in url:
            match = re.search(r'"viewCount":"(\d+)"', html)
            if not match: match = re.search(r'itemprop="interactionCount" content="(\d+)"', html)
            if match: view_count = int(match.group(1))
        elif 'facebook.com' in url:
            match = re.search(r'"play_count":(\d+)', html)
            if not match: match = re.search(r'"video_view_count":(\d+)', html)
            # Try parsing visible views texts out of desperation
            if not match:
                m = re.search(r'>([\d\.,MKmk]+)\s*[Vv]iews<', html)
                if m: view_count = m.group(1)
            if match: view_count = int(match.group(1))
        elif 'tiktok.com' in url:
            match = re.search(r'"playCount":(\d+)', html)
            if not match: match = re.search(r'"viewCount":(\d+)', html)
            if match: view_count = int(match.group(1))
            
        print(f" -> Result: {view_count}")
        if view_count is None:
            # write html to file to inspect
            platform = url.split('.')[1]
            with open(f"failed_{platform}.html", "w", encoding='utf-8') as f:
                f.write(html)
            print(f" -> Wrote source to failed_{platform}.html")
    except Exception as ex:
        print(f" -> Failed with exception {ex}")
