const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });
const ALLOWED = ['cdn.hentaimama.io', 'hentaimama.io', 'gdvid.info', 'na-01.javprovider.com'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { url, mode } = req.query;
  if (!url) return res.status(400).json({ error: 'url parameter required' });

  let parsed;
  try { parsed = new URL(url); } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const isAllowed = ALLOWED.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  if (!isAllowed) return res.status(403).json({ error: 'Host not allowed' });

  // mode=proxy — serve iframe HTML with X-Frame-Options stripped
  if (mode === 'proxy') {
    try {
      const upstream = await axios.get(url.replace('https://', 'http://'), {
        timeout: 15000, httpsAgent: agent, maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'http://hentaimama.io/',
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
        },
      });
      let html = upstream.data;
      html = html.replace(
        /(src|href|action)=["'](https?:\/\/(?:cdn\.)?hentaimama\.io[^"']*?)["']/gi,
        (_, attr, u) => `${attr}="/api/video?mode=proxy&url=${encodeURIComponent(u)}"`
      );
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      return res.status(200).send(html);
    } catch (err) {
      return res.status(502).send('Proxy error: ' + err.message);
    }
  }

  // Default — stream video/binary (adds CORS headers that gdvid.info lacks)
  try {
    const reqHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      'Referer': 'http://hentaimama.io/',
      'Origin': 'http://hentaimama.io',
    };
    if (req.headers.range) reqHeaders['Range'] = req.headers.range;

    const upstream = await axios.get(url, {
      responseType: 'stream', timeout: 30000, httpsAgent: agent, maxRedirects: 5,
      headers: reqHeaders,
    });

    res.setHeader('Content-Type', upstream.headers['content-type'] || 'video/mp4');
    if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
    if (upstream.headers['content-range']) res.setHeader('Content-Range', upstream.headers['content-range']);
    if (upstream.headers['accept-ranges']) res.setHeader('Accept-Ranges', upstream.headers['accept-ranges']);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.status(upstream.status);
    upstream.data.pipe(res);
  } catch (err) {
    if (!res.headersSent) res.status(502).json({ error: 'Proxy error: ' + err.message });
  }
};
