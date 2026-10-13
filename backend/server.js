require('events').EventEmitter.defaultMaxListeners = 100;
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const scraperRoutes = require('./routes/scraperRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Pretty-print JSON responses
app.set('json spaces', 2);

const scraperLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Terlalu banyak request. Coba lagi dalam 1 menit.' },
  skip: (req) => req.path === '/genres',
});

app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    api: 'Anicchi API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      home: '/api/home',
      monthly: '/api/monthly',
      recent_episodes: '/api/recent-episodes',
      search: '/api/search',
      episode: '/api/episode',
      detail: '/api/detail',
      genres: '/api/genres',
      list: '/api/list',
      series: '/api/list (with filter)',
      studio: '/api/studio/:slug',
      releases: '/api/releases/:year',
      video: '/api/video'
    },
    documentation: 'https://github.com/Kaitsuu23/Anicchi'
  });
});

// API routes
app.use('/api', scraperLimiter);
app.use('/api', scraperRoutes);

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

// Video proxy endpoint untuk stream video
app.get('/api/video', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('URL parameter is required');
  }
  
  try {
    const axios = require('axios');
    const decodedUrl = decodeURIComponent(url);
    
    console.log(`[Video Proxy] Streaming: ${decodedUrl}`);
    
    // Detect domain untuk set referer yang tepat
    let referer = 'https://hentaimama.io/';
    if (decodedUrl.includes('hentaidoge.org')) {
      referer = 'https://hentaidoge.org/';
    } else if (decodedUrl.includes('gdvid.info')) {
      referer = 'https://gdvid.info/';
    } else if (decodedUrl.includes('javprovider.com')) {
      referer = 'https://javprovider.com/';
    }
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
      'Origin': referer.replace(/\/$/, ''),
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site'
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    // Retry logic untuk handle connection issues
    let response;
    let retries = 3;
    
    while (retries > 0) {
      try {
        response = await axios({
          method: 'get',
          url: decodedUrl,
          responseType: 'stream',
          timeout: 90000, // Increase timeout lebih banyak
          maxRedirects: 10,
          headers: headers
        });
        console.log(`[Video Proxy] Success after ${3 - retries} retries`);
        break; // Success, exit retry loop
      } catch (retryErr) {
        retries--;
        console.log(`[Video Proxy] Retry ${3 - retries} failed: ${retryErr.message}`);
        if (retries === 0) throw retryErr;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
    
    // Forward content type dan headers penting
    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

    // Forward ALL relevant response headers from the target server (Content-Length, Content-Range, Accept-Ranges, etc.)
    const headersToForward = ['content-length', 'content-range', 'accept-ranges', 'content-type'];
    headersToForward.forEach(h => {
      if (response.headers[h]) {
        res.setHeader(h, response.headers[h]);
      }
    });

    // Set HTTP status code matching the target server (e.g., 200 or 206)
    res.status(response.status);

    // Pipe the stream directly
    response.data.pipe(res);
    
    // Handle stream errors
    response.data.on('error', (err) => {
      console.error('[Video Proxy] Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).send('Stream error: ' + err.message);
      }
    });
    
    response.data.on('close', () => {
      console.log('[Video Proxy] Stream closed');
    });
    
  } catch (err) {
    console.error('[Video Proxy] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Video proxy error: ' + err.message);
    }
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
