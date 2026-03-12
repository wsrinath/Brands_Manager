import urllib.request
import re
import json

urls = [
    'https://www.tiktok.com/@p.o.o.h_____/video/7586718210876034324?is_from_webapp=1&sender_device=pc',
    'https://www.facebook.com/share/v/18SxnceuxX/'
]

for url in urls:
    print(f"\n--- Testing {url} ---")
    try:
        # Create a request object that follows redirects
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        })
        
        response = urllib.request.urlopen(req, timeout=10)
        final_url = response.geturl()
        print(f"Final resolved URL: {final_url}")
        
        html = response.read().decode('utf-8', errors='ignore')
        view_count = None
        
        if 'tiktok.com' in url or 'tiktok.com' in final_url:
            # TikTok stores data in a script tag with id "__UNIVERSAL_DATA_FOR_REHYDRATION__"
            match = re.search(r'id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)</script>', html)
            if match:
                try:
                    data = json.loads(match.group(1))
                    # It's a deeply nested JSON. Stringify it and regex search the playCount
                    data_str = json.dumps(data)
                    play_match = re.search(r'"playCount":\s*(\d+)', data_str)
                    if play_match:
                        view_count = int(play_match.group(1))
                        print(f"Found TT view count in JSON rehydration: {view_count}")
                except Exception as e:
                    print(f"Failed to parse TT JSON: {e}")
            if not view_count:
                # Fallback simple regex
                m = re.search(r'"playCount":(\d+)', html)
                if m: view_count = int(m.group(1))
                
        elif 'facebook.com' in url or 'facebook.com' in final_url:
            # View counts on FB
            m1 = re.search(r'"play_count":(\d+)', html)
            m2 = re.search(r'"video_view_count":(\d+)', html)
            m3 = re.search(r'>([\d\.,KMkm]+)\s*[Vv]iews<', html)
            
            if m1: 
                view_count = int(m1.group(1))
                print('Found via play_count')
            elif m2: 
                view_count = int(m2.group(1))
                print('Found via video_view_count')
            elif m3:
                raw = m3.group(1).upper().replace(',', '')
                if 'K' in raw:
                    view_count = int(float(raw.replace('K', '')) * 1000)
                elif 'M' in raw:
                    view_count = int(float(raw.replace('M', '')) * 1000000)
                else:
                    view_count = int(raw)
                print('Found via Views text')
            
        print(f"Final Count: {view_count}")
    
    except Exception as ex:
        print(f"Exception for {url}: {ex}")
