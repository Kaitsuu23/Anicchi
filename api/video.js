const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });
const ALLOWED = [
  'cdn.hentaimama.io', 'hentaimama.io', 'gdvid.info',
  'na-01.javprovider.com', 'javprovider.com',
];

const PROXY_BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/video`
  : '/api/video';
  
function isAllowedHost(hostname) {
  return ALLOWED.some(h => hostname === h || hostname.endsWith('.' + h));
}

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

  if (!isAllowedHost(parsed.hostname)) {
    return res.status(403).json({ error: 'Host not allowed' });
  }

  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://hentaimama.io/',
    'Origin': 'https://hentaimama.io',
  };

  // ── mode=proxy: serve raw HTML with X-Frame-Options stripped ──────────────
  if (mode === 'proxy') {
    try {
      const upstream = await axios.get(url, {
        timeout: 15000, httpsAgent: agent, maxRedirects: 5,
        headers: { ...commonHeaders, Accept: 'text/html,application/xhtml+xml,*/*;q=0.9' },
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      return res.status(200).send(upstream.data);
    } catch (err) {
      return res.status(502).send('Proxy error: ' + err.message);
    }
  }

  // ── HLS playlist rewrite (.m3u8) ──────────────────────────────────────────
  const isM3u8 = parsed.pathname.endsWith('.m3u8') || url.includes('.m3u8');
  if (isM3u8) {
    try {
      const upstream = await axios.get(url, {
        timeout: 15000, httpsAgent: agent, maxRedirects: 5,
        headers: commonHeaders,
        responseType: 'text',
      });

      let playlist = upstream.data;
      // Determine base URL for resolving relative segment paths
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

      // Rewrite every URI in the playlist to go through this proxy
      playlist = playlist.replace(/^((?!#)([^\r\n]+))$/gm, (line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        // Resolve relative URLs
        const absUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
        return `${PROXY_BASE}?url=${encodeURIComponent(absUrl)}`;
      });

      // Also rewrite URIs inside #EXT-X-MAP, #EXT-X-KEY, etc.
      playlist = playlist.replace(/URI="([^"]+)"/g, (_, uri) => {
        const absUrl = uri.startsWith('http') ? uri : baseUrl + uri;
        return `URI="${PROXY_BASE}?url=${encodeURIComponent(absUrl)}"`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).send(playlist);
    } catch (err) {
      return res.status(502).json({ error: 'HLS proxy error: ' + err.message });
    }
  }

  // ── Default: stream binary (video segments, mp4, etc.) ────────────────────
  try {
    const reqHeaders = { ...commonHeaders };
    if (req.headers.range) reqHeaders['Range'] = req.headers.range;

    const upstream = await axios.get(url, {
      responseType: 'stream', timeout: 30000, httpsAgent: agent, maxRedirects: 5,
      headers: reqHeaders,
    });

    const status = upstream.status;
    res.setHeader('Content-Type', upstream.headers['content-type'] || 'video/mp2t');
    if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
    if (upstream.headers['content-range']) res.setHeader('Content-Range', upstream.headers['content-range']);
    if (upstream.headers['accept-ranges']) res.setHeader('Accept-Ranges', upstream.headers['accept-ranges']);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.status(status);
    upstream.data.pipe(res);
  } catch (err) {
    if (!res.headersSent) res.status(502).json({ error: 'Stream error: ' + err.message });
  }
};
