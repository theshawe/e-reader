const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

require('dotenv').config();
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;


app.get('/fetchFeed', async (req, res) => {
  const feedUrl = req.query.url;
  if (!feedUrl) {
    return res.status(400).send('Feed URL is required');
  }
  try {
    const response = await fetch(feedUrl);
    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).send('Error fetching feed');
  }
});

app.get('/resolveYouTubeChannel', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('YouTube URL is required');
  }

  try {
    let channelId = null;
    if (url.includes('@')) {
      const handle = url.split('youtube.com/')[1].replace('@', '');
      channelId = await getChannelIdFromYouTubeHandle(handle);
    } else if (url.includes('channel')) {
      channelId = url.split('channel/')[1].split('/')[0];
    } else if (url.includes('user')) {
      const username = url.split('user/')[1].split('/')[0];
      channelId = await getChannelIdFromYouTubeHandle(username);
    }

    if (channelId) {
      res.json({ channelId });
    } else {
      res.status(404).send('Channel ID not found');
    }
  } catch (error) {
    console.error('Error resolving YouTube channel:', error);
    res.status(500).send('Error resolving YouTube channel');
  }
});

async function getChannelIdFromYouTubeHandle(handle) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent('@' + handle)}&key=${YOUTUBE_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.channelId;
    } else {
      return await scrapeChannelId(handle);
    }
  } catch (error) {
    console.error('Error fetching channel ID from handle:', error);
    return null;
  }
}

async function scrapeChannelId(handle) {
  try {
    const ytUrl = `https://www.youtube.com/@${handle}`;
    const response = await fetch(ytUrl);
    const text = await response.text();
    const match = text.match(/"channelId":"(UC[0-9A-Za-z_-]+)"/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error scraping YouTube page:', error);
    return null;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
