import urllib.request
import re

def test_fb(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # Typical FB view count: "play_count":1234 or >1.2M Views<
        match = re.search(r'"play_count":(\d+)', html)
        if match: return f"FB play_count JSON: {match.group(1)}"
        match = re.search(r'([\d\.,MKmk]+)\s*[Vv]iews', html)
        if match: return f"FB Views text: {match.group(1)}"
        return "Not found in FB"
    except Exception as e:
        return str(e)

def test_tt(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        match = re.search(r'"playCount":(\d+)', html)
        if match: return f"TT playCount JSON: {match.group(1)}"
        return "Not found in TT"
    except Exception as e:
        # TikTok sometimes blocks urllib with 403, we can catch it
        return str(e)

print(test_fb('https://www.facebook.com/reel/160657102'))
print(test_tt('https://www.tiktok.com/@_dimagim/video/7327310065757785346'))
