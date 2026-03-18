require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const YT_API_KEY = process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY || process.env.YT;

// Helper: Extract YT ID
function extractYouTubeId(url) {
    const regex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Helper: Recursively search for view count in a parsed JSON object
function findViewCount(obj) {
    if (typeof obj !== 'object' || obj === null) return null;
    if (obj.video_view_count !== undefined) return obj.video_view_count;
    if (obj.play_count !== undefined) return obj.play_count;
    if (obj.viewCount !== undefined) return obj.viewCount;
    for (const key of Object.keys(obj)) {
        const result = findViewCount(obj[key]);
        if (result !== null) return result;
    }
    return null;
}

// Helper: Parse a response body that may be NDJSON (newline-delimited JSON)
// Facebook GraphQL often returns multiple JSON objects separated by newlines
function parseNDJSON(text) {
    const results = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
        try {
            results.push(JSON.parse(line));
        } catch {
            // Not valid JSON on its own — skip
        }
    }
    // If NDJSON parsing found nothing, try the whole text as one JSON blob
    if (results.length === 0) {
        try {
            results.push(JSON.parse(text));
        } catch {
            // Not parseable at all
        }
    }
    return results;
}

// Basic proxy endpoint for views
app.get('/views', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter is required' });

    try {
        // ─── YouTube ────────────────────────────────────────────────────────────
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = extractYouTubeId(url);
            if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });
            if (!YT_API_KEY) return res.status(500).json({ error: 'YouTube API key not configured' });

            const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${YT_API_KEY}`;
            const ytRes = await axios.get(apiUrl);

            if (ytRes.data.items && ytRes.data.items.length > 0) {
                const viewCount = ytRes.data.items[0].statistics.viewCount;
                return res.json({ platform: 'youtube', view_count: viewCount });
            } else {
                return res.status(404).json({ error: 'YouTube Video not found' });
            }
        }

        // ─── TikTok ─────────────────────────────────────────────────────────────
        else if (url.includes('tiktok.com')) {
            const ttRes = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            });

            const $ = cheerio.load(ttRes.data);
            let viewCount = 'N/A';

            const scriptData = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
            if (scriptData) {
                try {
                    const match = scriptData.match(/"playCount":(\d+)/);
                    if (match) viewCount = match[1];
                } catch (e) {
                    console.error("Error reading TT JSON state");
                }
            }

            if (viewCount === 'N/A') {
                const metaDesc = $('meta[name="description"]').attr('content');
                if (metaDesc) {
                    const viewMatch = metaDesc.match(/([0-9.,KMB]+)\s+Views/i);
                    if (viewMatch) viewCount = viewMatch[1];
                }
            }

            return res.json({ platform: 'tiktok', view_count: viewCount });
        }

        // ─── Facebook ────────────────────────────────────────────────────────────
        else if (url.includes('facebook.com') || url.includes('fb.watch')) {
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                ]
            });

            let viewCount = 'N/A';

            try {
                const page = await browser.newPage();

                await page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                );

                // Intercept requests — block heavy assets to speed things up
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                    const resType = request.resourceType();
                    if (['image', 'media', 'font', 'stylesheet'].includes(resType)) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                });

                // FIX 1: Set up the response listener BEFORE navigating,
                //         but resolve/reject OUTSIDE the promise constructor
                //         so the browser.close() is always guaranteed.
                let resolveView;
                let rejectView;
                let viewResolved = false; // guard against resolving twice
                const viewPromise = new Promise((resolve, reject) => {
                    resolveView = (val) => {
                        if (!viewResolved) {
                            viewResolved = true;
                            resolve(val);
                        }
                    };
                    rejectView = reject;
                });

                page.on('response', async (response) => {
                    // Only look at GraphQL POSTs
                    if (!response.url().includes('/api/graphql/')) return;
                    if (response.request().method() !== 'POST') return;

                    try {
                        const text = await response.text();

                        // Skip responses that obviously won't have view counts
                        if (!text.includes('video_view_count') &&
                            !text.includes('play_count') &&
                            !text.includes('viewCount')) return;

                        // FIX 2: Handle NDJSON — Facebook sends newline-delimited JSON
                        const objects = parseNDJSON(text);
                        for (const obj of objects) {
                            const found = findViewCount(obj);
                            if (found !== null) {
                                console.log(`Found view count: ${found}`);
                                resolveView(String(found));
                                return;
                            }
                        }

                        // FIX 3: Fallback — regex directly on raw text in case
                        //         the JSON structure is deeply nested or unusual
                        const regexPatterns = [
                            /"video_view_count"\s*:\s*(\d+)/,
                            /"play_count"\s*:\s*(\d+)/,
                            /"viewCount"\s*:\s*(\d+)/,
                        ];
                        for (const pattern of regexPatterns) {
                            const match = text.match(pattern);
                            if (match) {
                                console.log(`Found view count via regex: ${match[1]}`);
                                resolveView(match[1]);
                                return;
                            }
                        }
                    } catch (e) {
                        console.error('Error processing GraphQL response:', e.message);
                    }
                });

                // Use domcontentloaded — FB never truly goes idle
                console.log(`Navigating to: ${url}`);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

                // Wait up to 20s for a GraphQL response to resolve the view count.
                // If already resolved by a fast response, this exits immediately.
                const TIMEOUT_MS = 20000;
                viewCount = await Promise.race([
                    viewPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), TIMEOUT_MS))
                ]);

                // If GraphQL never fired, scrape the rendered HTML as last resort
                if (!viewCount) {
                    console.log('GraphQL did not resolve — falling back to HTML scrape');
                    try {
                        const html = await page.content();
                        const regexPatterns = [
                            /"video_view_count"\s*:\s*(\d+)/,
                            /"play_count"\s*:\s*(\d+)/,
                            /(\d[\d,.]+)\s*(?:views?|Views?)/,
                        ];
                        for (const pattern of regexPatterns) {
                            const match = html.match(pattern);
                            if (match) {
                                console.log(`Found view count in HTML: ${match[1]}`);
                                viewCount = match[1].replace(/,/g, '');
                                break;
                            }
                        }
                    } catch (e) {
                        console.error('Error scraping page HTML:', e.message);
                    }
                }

                viewCount = viewCount || 'N/A';

            } finally {
                // FIX 6: Always close the browser, even if something throws
                await browser.close();
            }

            return res.json({ platform: 'facebook', view_count: viewCount });
        }

        else {
            return res.status(400).json({ error: 'Unsupported URL. Only YouTube, TikTok, and Facebook are supported.' });
        }

    } catch (error) {
        console.error('Request proxy error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch views', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`View scraper microservice listening on port ${PORT}`);
});