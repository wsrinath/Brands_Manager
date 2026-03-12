import urllib.request
import re

url = 'https://www.youtube.com/watch?v=gNug0DRD3EY'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'})

try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    match = re.search(r'"viewCount":"(\d+)"', html)
    if match:
        print('Views from JSON extract:', match.group(1))
    else:
        # Fallback to meta tag or other patterns if JSON is not present
        match2 = re.search(r'itemprop="interactionCount" content="(\d+)"', html)
        if match2:
            print('Views from meta tag:', match2.group(1))
        else:
            print('Not found in HTML')
except Exception as e:
    print('Error:', e)
