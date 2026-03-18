import asyncio
from main import get_views
import os

async def test():
    urls = [
        "https://www.youtube.com/shorts/335Z4GwhHAs",
        "https://youtu.be/3FzC94B2Bd0?si=OlEeKj39zyhVqV2A"
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
