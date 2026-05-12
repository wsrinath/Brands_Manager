# Microservice Implementation Plan

We are building a Node.js Express microservice that acts as an API proxy to fetch video views for TikTok, YouTube, and Facebook. This service will be containerized using Docker and deployed to Google Cloud Run.

## Proposed Changes

### 1. Project Setup
- **Initialize**: `npm init -y` inside `TTYTFB_VIEW`
- **Dependencies**: Install `express`, `cors`, `dotenv`, `axios`, and `cheerio` for web scraping.

### 2. Core API Service
#### [NEW] `index.js`(file:///c:/Users/HP/Desktop/fb and TT view_extractor/TTYTFB_VIEW/index.js)
Create an Express server with a main `GET /views` endpoint.
- **YouTube Strategy**: Use the YouTube Data API v3 directly using `axios` with the key stored in [.env](file:///c:/Users/HP/Desktop/fb%20and%20TT%20view_extractor/TTYTFB_VIEW/.env).
- **TikTok Strategy**: Use `axios` with a standard user-agent and `cheerio` to scrape the view count from the metadata or `__UNIVERSAL_DATA_FOR_REHYDRATION__` script tag.
- **Facebook Strategy**: Similar to TikTok, parse the public URL for the view count element or metadata.
- **Caching/Rate Limiting (Optional)**: Can add a small memory cache later if needed to avoid hitting bot limits.

### 3. Deployment Configuration
#### [NEW] `Dockerfile`(file:///c:/Users/HP/Desktop/fb and TT view_extractor/TTYTFB_VIEW/Dockerfile)
A basic Node.js Dockerfile setup using a lightweight image (`node:18-alpine` or similar).

#### [NEW] `.gcloudignore`(file:///c:/Users/HP/Desktop/fb and TT view_extractor/TTYTFB_VIEW/.gcloudignore)
To prevent `node_modules` and [.env](file:///c:/Users/HP/Desktop/fb%20and%20TT%20view_extractor/TTYTFB_VIEW/.env) from being uploaded.

## Verification Plan
1. **Local Testing**: Run `npm start` locally and use tools like `curl` or Postman to test `/views?url=[YT_URL]`, `/views?url=[TT_URL]`, and `/views?url=[FB_URL]`.
2. **Docker Build**: Run `docker build -t view-scraper .` locally to ensure it builds.
3. **Cloud Run Deployment**: The user can run `gcloud run deploy view-api --source .` to deploy and receive the public `app.run` URL.
