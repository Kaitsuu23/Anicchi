const express = require('express');
const router = express.Router();
const { home, list, hentaiList, newMonthly, recentEpisodes, search, episode, detail, genres, genre, release, studio, topRated } = require('../controllers/scraperController');

router.get('/home', home);
router.get('/list', list);
router.get('/hentai-list', hentaiList);
router.get('/monthly', newMonthly);
router.get('/recent-episodes', recentEpisodes);
router.get('/search', search);
router.get('/episode', episode);
router.get('/detail', detail);
router.get('/genres', genres);
router.get('/genre/:slug', genre);
router.get('/releases/:year', release);
router.get('/studio/:slug', studio);
router.get('/toprated', topRated);

// Image proxy — bypass hotlink protection & ISP block
router.get('/image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const axios = require('axios');
    const https = require('https');
    const agent = new https.Agent({ rejectUnauthorized: false });

    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 10000,
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://hentaimama.io/',
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
      },
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 1 hari
    res.setHeader('Access-Control-Allow-Origin', '*');
    response.data.pipe(res);
  } catch (err) {
    res.status(502).json({ error: 'Image proxy failed: ' + err.message });
  }
});

module.exports = router;
