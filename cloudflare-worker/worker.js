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
          },
          redirect: 'follow',
        });

        // Collect cookies
        const setCookies = pageRes.headers.getSetCookie?.() || [];
        const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');

        // Step 2: POST AJAX with those cookies
        const ajaxRes = await fetch('http://hentaimama.io/wp-admin/admin-ajax.php', {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': epUrl.replace('https://', 'http://'),
            'Origin': 'http://hentaimama.io',
            'Accept': '*/*',
            ...(cookieStr ? { 'Cookie': cookieStr } : {}),
          },
          body: `action=get_player_contents&a=${postId}`,
        });

        const text = await ajaxRes.text();
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
