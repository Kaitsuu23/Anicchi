const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const scraperRoutes = require('./routes/scraperRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

const scraperLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Terlalu banyak request. Coba lagi dalam 1 menit.' },
  skip: (req) => req.path === '/genres',
});

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', scraperLimiter);
app.use('/api', scraperRoutes);

const pages = [
  'series', 'uncensored', 'hentai-list', 'threed', '3d',
  'genres', 'genre', 'monthly', 'recent-series',
  'recent-episodes', 'search', 'letter'
];

// Letter filter route
app.get('/', (req, res) => {
  if (req.query.letter || req.query.s) {
    return res.sendFile(path.join(__dirname, '../frontend/pages/letter.html'));
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Clean URL routes — serve langsung dengan atau tanpa trailing slash
pages.forEach(page => {
  const file = page === '3d' ? 'threed' : page;
  const handler = (req, res) => res.sendFile(path.join(__dirname, `../frontend/pages/${file}.html`));
  app.get(`/${page}`, handler);
  app.get(`/${page}/`, handler);
});

// Search clean URL: /search/query
app.get('/search/:query', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/search.html')));
app.get('/search/:query/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/search.html')));

// Genre
app.get('/genre/:slug/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/genre.html')));
app.get('/genre/:slug', (req, res) => res.redirect(`/genre/${req.params.slug}/`));

// Detail & Episodes clean URL
app.get('/detail/:slug/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/detail.html')));
app.get('/detail/:slug', (req, res) => res.redirect(`/detail/${req.params.slug}/`));
app.get('/episodes/:slug/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/episodes.html')));
app.get('/episodes/:slug', (req, res) => res.redirect(`/episodes/${req.params.slug}/`));

// Release & Studio
app.get('/release/:year/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/release.html')));
app.get('/release/:year', (req, res) => res.redirect(`/release/${req.params.year}/`));
app.get('/studio/:slug/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/studio.html')));
app.get('/studio/:slug', (req, res) => res.redirect(`/studio/${req.params.slug}/`));

// Proxy endpoint untuk bypass frame-ancestors CSP
app.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('https://hentaimama.io')) {
    return res.status(400).send('Invalid URL');
  }
  try {
    const axios = require('axios');
    const WORKER = process.env.CF_WORKER_URL;
    const response = await axios.get(`${WORKER}?url=${encodeURIComponent(url)}`, {
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' }
    });
    // Set header yang aman — jangan forward CSP dari upstream
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    // Fix relative URLs
    let html = response.data;
    html = html.replace(/(href|src|action)="\/(?!\/)/g, `$1="https://hentaimama.io/`);
    res.send(html);
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
});
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
