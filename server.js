// server.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000'], // Replace with your frontend's origin
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure YOUTUBE_API_KEY is set
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) {
  console.error('Error: YOUTUBE_API_KEY is not set in the .env file.');
  process.exit(1);
}

// Utility function to validate URLs
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

// Endpoint to fetch RSS feeds
app.get('/fetchFeed', async (req, res) => {
  const feedUrl = req.query.url;

  if (!feedUrl) {
    return res.status(400).json({ error: 'Feed URL is required.' });
  }

  if (!isValidUrl(feedUrl)) {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  // Prevent SSRF by allowing only specific protocols
  const allowedProtocols = ['http:', 'https:'];
  const urlObj = new URL(feedUrl);
  if (!allowedProtocols.includes(urlObj.protocol)) {
    return res.status(400).json({ error: 'URL must start with http or https.' });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'E-Reader-App/1.0',
      },
      timeout: 5000, // 5 seconds timeout
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch the RSS feed. Status: ${response.status}` });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || (!contentType.includes('xml') && !contentType.includes('rss'))) {
      return res.status(400).json({ error: 'URL does not point to a valid RSS/XML feed.' });
    }

    const data = await response.text();
    res.set('Content-Type', 'application/rss+xml');
    res.send(data);
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'An error occurred while fetching the RSS feed.' });
  }
});

// Endpoint to resolve YouTube channel URLs to channel IDs
app.get('/resolveYouTubeChannel', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required.' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  try {
    let channelId = null;

    if (url.includes('youtube.com/channel/')) {
      // URL Format: /channel/CHANNEL_ID
      channelId = url.split('youtube.com/channel/')[1].split('/')[0];
    } else if (url.includes('youtube.com/c/') || url.includes('youtube.com/user/')) {
      // URL Formats: /c/CustomName or /user/Username
      const pathSegments = url.split('/');
      let identifier = '';
      if (url.includes('youtube.com/c/')) {
        identifier = pathSegments[pathSegments.indexOf('c') + 1];
      } else if (url.includes('youtube.com/user/')) {
        identifier = pathSegments[pathSegments.indexOf('user') + 1];
      }
      channelId = await getChannelIdFromYouTubeHandle(identifier);
    } else if (url.includes('youtube.com/@')) {
      // URL Format: /@Handle
      const handle = url.split('youtube.com/@')[1].split('/')[0];
      channelId = await getChannelIdFromYouTubeHandle(handle);
    }

    if (channelId) {
      res.json({ channelId });
    } else {
      res.status(404).json({ error: 'Channel ID not found.' });
    }
  } catch (error) {
    console.error('Error resolving YouTube channel:', error);
    res.status(500).json({ error: 'An error occurred while resolving the YouTube channel.' });
  }
});

// Helper function to get channel ID from YouTube handle
async function getChannelIdFromYouTubeHandle(handle) {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${YOUTUBE_API_KEY}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000); // 5 seconds timeout

    const response = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.channelId;
    } else {
      // Attempt to scrape the channel ID if not found via API
      const scrapedId = await scrapeChannelId(handle);
      return scrapedId;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('YouTube API request timed out.');
    } else {
      console.error('Error fetching channel ID from YouTube API:', error);
    }
    return null;
  }
}

// Helper function to scrape channel ID from YouTube page
async function scrapeChannelId(handle) {
  try {
    const ytUrl = `https://www.youtube.com/@${handle}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000); // 5 seconds timeout

    const response = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'E-Reader-App/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Failed to fetch YouTube page for handle "${handle}". Status: ${response.status}`);
      return null;
    }

    const text = await response.text();
    const match = text.match(/"channelId":"(UC[0-9A-Za-z_-]+)"/);
    return match ? match[1] : null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('YouTube page scrape request timed out.');
    } else {
      console.error('Error scraping YouTube page:', error);
    }
    return null;
  }
}

// Serve index.html for all other routes (to support client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
