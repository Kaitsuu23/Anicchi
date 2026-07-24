const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });
const ALLOWED = [
  'cdn.hentaimama.io', 'hentaimama.io', 'gdvid.info',
  'na-01.javprovider.com', 'javprovider.com',
  // Add more javprovider subdomains if needed
  'na-02.javprovider.com', 'na-03.javprovider.com',
  'eu-01.javprovider.com', 'eu-02.javprovider.com',
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

      let playlist = String(upstream.data);
      
      // Validate it's actually an M3U8 file
      if (!playlist.trim().startsWith('#EXTM3U')) {
        // Not a valid playlist — might be error HTML, pass through as-is or fail
        return res.status(502).send('Invalid M3U8: does not start with #EXTM3U');
      }

      // Determine base URL for resolving relative segment paths
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

      // Split by lines, rewrite non-comment lines
      const lines = playlist.split(/\r?\n/);
      const rewritten = lines.map(line => {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          // But check for URI= inside comments (e.g., #EXT-X-KEY:URI="...")
          if (trimmed.includes('URI=')) {
            return line.replace(/URI="([^"]+)"/g, (_, uri) => {
              const absUrl = uri.startsWith('http') ? uri : baseUrl + uri;
              return `URI="${PROXY_BASE}?url=${encodeURIComponent(absUrl)}"`;
            });
          }
          return line;
        }
        // Non-comment line = segment/playlist URI
        const absUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
        return `${PROXY_BASE}?url=${encodeURIComponent(absUrl)}`;
      });

      const rewrittenPlaylist = rewritten.join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).send(rewrittenPlaylist);
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
