/**
 * Cloudflare Worker – Proxy GET & POST untuk bypass ISP block & SSL Expired
 */

const ALLOWED_HOSTS = [
  'hentaimama.io',
  'cdn.hentaimama.io',
  'gdvid.info',
  'shortened.is',
  'pstream.la',
  'mixdrop.co',
  'doodstream.com',
  'dood.li',
  'dood.wf',
  'dood.pm',
  'voe.sx'
];

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const { searchParams } = new URL(request.url);

    // Special mode: ajax — fetch episode page first to get cookies, then POST AJAX
    if (searchParams.get('mode') === 'ajax') {
      const postId = searchParams.get('postId');
      const epUrl = searchParams.get('epUrl') || 'http://hentaimama.io/';
      if (!postId) return jsonError('postId diperlukan untuk mode ajax.', 400);

      try {
        // Step 1: fetch episode page to get session cookies
        const pageRes = await fetch(epUrl.replace('https://', 'http://'), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          redirect: 'follow',
        });

        // Collect ALL cookies including from redirects
        const setCookies = pageRes.headers.getSetCookie?.() || [];
        const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');

        // Also extract nonce from page HTML if present
        const pageHtml = await pageRes.text();
        const nonceMatch = pageHtml.match(/"nonce"\s*:\s*"([a-f0-9]+)"/);
        const nonce = nonceMatch ? nonceMatch[1] : '';

        // Step 2: POST AJAX with cookies and nonce
        const body = nonce
          ? `action=get_player_contents&a=${postId}&nonce=${nonce}`
          : `action=get_player_contents&a=${postId}`;

        const ajaxRes = await fetch('http://hentaimama.io/wp-admin/admin-ajax.php', {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': epUrl.replace('https://', 'http://'),
            'Origin': 'http://hentaimama.io',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            ...(cookieStr ? { 'Cookie': cookieStr } : {}),
          },
          body,
        });

        const text = await ajaxRes.text();

        // If AJAX returns 0 (blocked), try extracting from page HTML directly
        if (text.trim() === '0' || text.trim() === '') {
          // Try to find player data embedded in page HTML
          const iframeMatch = pageHtml.match(/id="option-1"[^>]*>([\s\S]*?)<\/div>/i);
          if (iframeMatch && iframeMatch[1].trim()) {
            return new Response(JSON.stringify([iframeMatch[1].trim()]), {
              status: 200,
              headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
            });
          }
          // Try new2.php approach as fallback — extract postId-based path
          const new2Match = pageHtml.match(/new2\.php\?p=([A-Za-z0-9+/=]+)/);
          if (new2Match) {
            const new2Res = await fetch(`http://hentaimama.io/new2.php?p=${new2Match[1]}`);
            const new2Html = await new2Res.text();
            const mp4Match = new2Html.match(/file\s*:\s*["']([^"']+)["']/i);
            if (mp4Match) {
              return new Response(JSON.stringify([`<iframe src="${mp4Match[1]}"></iframe>`]), {
                status: 200,
                headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
              });
            }
          }
        }

        return new Response(text, {
          status: 200,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        });
      } catch(err) {
        return jsonError('AJAX failed: ' + err.message, 502);
      }
    }

    try {
      const targetUrl = searchParams.get('url');
      if (!targetUrl) return jsonError('Parameter url diperlukan.', 400);

      let finalUrl = targetUrl;
      if (targetUrl.includes('hentaimama.io')) {
        finalUrl = targetUrl.replace('https://', 'http://');
      }

      let parsed;
      try {
        parsed = new URL(finalUrl);
      } catch {
        return jsonError('URL tidak valid.', 400);
      }

      const isAllowed = ALLOWED_HOSTS.some(h =>
        parsed.hostname === h || parsed.hostname.endsWith('.' + h)
      );
      if (!isAllowed) return jsonError(`Host ${parsed.hostname} tidak diizinkan.`, 403);

      const method = request.method === 'POST' ? 'POST' : request.method === 'HEAD' ? 'HEAD' : 'GET';
      const body = (method === 'POST') ? await request.text() : undefined;
      const contentType = request.headers.get('content-type') || 'application/x-www-form-urlencoded';
      const rangeHeader = request.headers.get('range');

      const response = await fetch(finalUrl, {
        method,
        body,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': method === 'POST' ? '*/*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'http://hentaimama.io/',
          'Origin': 'http://hentaimama.io',
          'X-Requested-With': 'XMLHttpRequest',
          ...(method === 'POST' ? { 'Content-Type': contentType } : {}),
          ...(rangeHeader ? { 'Range': rangeHeader } : {}),
        },
        redirect: 'follow',
      });

      return new Response(response.body, {
        status: response.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
          'Content-Length': response.headers.get('content-length'),
          'Content-Range': response.headers.get('content-range'),
          'Accept-Ranges': response.headers.get('accept-ranges'),
          'X-Proxied-By': 'cf-worker-v2',
        },
      });
    } catch (err) {
      return jsonError('Gagal fetch: ' + err.message, 502);
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  };
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}
