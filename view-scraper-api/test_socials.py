import asyncio
from main import get_views
import os

async def test():
    urls = [
        "https://www.facebook.com/share/v/17fjXDexXF/",
        "https://www.tiktok.com/@status___video_/video/7585200221844426005?is_from_webapp=1&sender_device=pc"
    ]
    for url in urls:
        print(f"\n--- Testing: {url} ---")
        try:
            res = await get_views(url)
            print(f"Result: {res}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
