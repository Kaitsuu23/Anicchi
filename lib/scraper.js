const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const BASE_URL = 'http://hentaimama.io';
const WORKER_URL = process.env.CF_WORKER_URL;
const PUPPET_URL = process.env.PUPPET_URL; // e.g. https://your-service.railway.app
const PUPPET_KEY = process.env.PUPPET_KEY; // API key

// Agent untuk mengabaikan error SSL expired dari target
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Manual DNS Resolution via Google DoH (DNS-over-HTTPS)
 * Bypass DNS Hijacking/ISP Block.
 */
async function resolveDns(hostname) {
  try {
    const res = await axios.get(`https://8.8.8.8/resolve?name=${hostname}&type=A`, { 
      timeout: 5000,
      headers: { 'Accept': 'application/json' }
    });
    if (res.data?.Answer) {
      return res.data.Answer.find(a => a.type === 1)?.data;
    }
  } catch (e) {
    console.error(`[DNS] DoH Failed for ${hostname}:`, e.message);
  }
  return null;
}

/**
 * Manual DNS Resolution via Google DoH (DNS-over-HTTPS)
 * Digunakan untuk bypass DNS hijacking/block di level ISP/Server.
 */
async function resolveHostname(hostname) {
  try {
    const res = await axios.get(`https://dns.google/resolve?name=${hostname}&type=A`, { timeout: 5000 });
    if (res.data && res.data.Answer && res.data.Answer.length > 0) {
      return res.data.Answer[0].data; // Return IP address
    }
  } catch (e) {
    console.error(`[DNS] Failed to resolve ${hostname} via DoH:`, e.message);
  }
  return null;
}

async function fetchPageRaw(url) {
  if (!WORKER_URL) throw new Error('CF_WORKER_URL environment variable is not set');
  
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  
  // Paksa ke HTTP untuk bypass SSL issues
  const httpUrl = url.replace(/^https:/i, 'http:');
  const targetUrl = httpUrl.includes('?') ? `${httpUrl}&_cb=${Date.now()}` : `${httpUrl}?_cb=${Date.now()}`;
  
  // Try 1: Worker (Primary)
  try {
    const res = await axios.get(`${WORKER_URL}?url=${encodeURIComponent(targetUrl)}`, {
      timeout: 20000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'http://hentaimama.io/'
      },
      httpsAgent: agent,
    });
    if (res.data) return res.data;
  } catch (err) {
    console.warn(`[Scraper] Worker fail: ${err.message}`);
  }

  // Try 2: Direct HTTP with DNS Fallback (Secondary)
  try {
    const directRes = await axios.get(httpUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      httpsAgent: agent,
    });
    return directRes.data;
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      const ip = await resolveDns(hostname);
      if (ip) {
        console.log(`[DNS] Retrying with IP: ${ip}`);
        try {
          const ipRes = await axios.get(httpUrl.replace(hostname, ip), {
            timeout: 10000,
            headers: { 'Host': hostname, 'User-Agent': 'Mozilla/5.0' },
            httpsAgent: agent,
          });
          return ipRes.data;
        } catch (e) { /* fail */ }
      }
    }
    throw err;
  }
}

async function fetchPage(url) {
  return cheerio.load(await fetchPageRaw(url));
}

function parseArticles($, container) {
  const videos = [];
  container.find('article').each((i, el) => {
    const $el = $(el);
    const poster = $el.find('.poster');
    const data = $el.find('.data');

    // Thumbnail
    const thumbnail =
      poster.find('img.lazyload').attr('data-src') ||
      poster.find('noscript img').attr('src') || '';

    // Link — episode link atau tvshow link
    const link =
      poster.find('a[href]').attr('href') ||
      data.find('a[href]').attr('href') || '';

    // Series title (overlay di poster)
    const seriesTitle = poster.find('span.serie').text().trim();

    // Episode/title dari .data h3
    const episodeTitle = data.find('h3').text().trim();

    // Tanggal
    const date = data.find('span').text().trim();

    // Badge: SUB / UNC
    const badge =
      poster.find('.status-sub').text().trim() ||
      poster.find('.status-unc').text().trim() || '';

    // Rating
    const rating = poster.find('.rating').text().replace(/[^\d.]/g, '').trim();

    // season_m link (Recent Episodes punya ini)
    const seasonLink = poster.find('.season_m a').attr('href') || '';

    const finalLink = seasonLink || link;
    const finalTitle = seriesTitle || episodeTitle;

    if (finalTitle && finalLink) {
      videos.push({ title: finalTitle, episodeTitle, link: finalLink, thumbnail, badge, rating, date });
    }
  });
  return videos;
}

async function scrapeHome() {
  const $ = await fetchPage(BASE_URL);
  const wrapper = $('div.content_center');
  const sections = [];
  const children = wrapper.children().toArray();

  for (let i = 0; i < children.length; i++) {
    const child = $(children[i]);
    if (children[i].tagName !== 'header') continue;

    const sectionTitle = child.find('h2').text().trim();
    const seeAll = child.find('a.see-all').attr('href') || '';
    if (!sectionTitle) continue;

    for (let j = i + 1; j < children.length; j++) {
      const next = $(children[j]);
      if (next.hasClass('items')) {
        sections.push({ section: sectionTitle, seeAll, videos: parseArticles($, next) });
        break;
      }
      if (children[j].tagName === 'header') break;
    }
  }
  return sections;
}

async function scrapeList(url) {
  const $ = await fetchPage(url);
  const videos = [];

  $('article').each((i, el) => {
    const $el = $(el);
    const poster = $el.find('.poster');
    const data = $el.find('.data');

    const thumbnail =
      poster.find('img.lazyload').attr('data-src') ||
      poster.find('noscript img').attr('src') || '';

    const link =
      poster.find('a[href]').attr('href') ||
      data.find('a[href]').attr('href') || '';

    const seriesTitle = poster.find('span.serie').text().trim();
    const dataTitle = data.find('h3').text().trim();
    const title = seriesTitle || dataTitle;

    const episodeTitle = dataTitle;
    const date = data.find('span').text().trim();
    const badge =
      poster.find('.status-sub').text().trim() ||
      poster.find('.status-unc').text().trim() || '';
    const rating = poster.find('.rating').text().replace(/[^\d.]/g, '').trim();
    const seasonLink = poster.find('.season_m a').attr('href') || '';
    const finalLink = seasonLink || link;

    if (title && finalLink) {
      videos.push({ title, episodeTitle, link: finalLink, thumbnail, badge, rating, date });
    }
  });

  // Pagination — extract semua page numbers + last page
  const pages = [];
  const seen = new Set();

  $('.pagination a, .nav-links a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (href && text && !seen.has(href)) {
      seen.add(href);
      pages.push({ text, href });
    }
  });

  // Cari last page number dari link terakhir
  let lastPage = 1;
  // Preserve query params untuk letter filter URLs
  let basePageUrl = url.replace(/\/page\/\d+\/?/, '/');
  // Jika URL punya query params (letter filter), strip page dari path saja via URL API
  if (url.includes('?')) {
    try {
      const urlObj = new URL(url);
      urlObj.pathname = urlObj.pathname.replace(/\/page\/\d+\/?/, '/');
      basePageUrl = urlObj.toString();
    } catch (e) { /* ignore */ }
  }

  pages.forEach(p => {
    const m = p.href.match(/\/page\/(\d+)\/?/);
    if (m) lastPage = Math.max(lastPage, parseInt(m[1]));
  });

  // Cari current page dari URL
  const currentMatch = url.match(/\/page\/(\d+)\/?/);
  const currentPage = currentMatch ? parseInt(currentMatch[1]) : 1;

  return { videos, pages, currentPage, lastPage, basePageUrl };
}

async function scrapeSearch(query) {
  const url = `https://hentaimama.io/?s=${encodeURIComponent(query)}`;
  const $ = await fetchPage(url);
  const videos = [];

  $('article').each((i, el) => {
    const $el = $(el);
    const link = $el.find('a').first().attr('href') || '';
    const title = $el.find('.title a').first().text().trim() ||
                  $el.find('img').first().attr('alt') || '';
    const thumbnail = $el.find('img').first().attr('src') ||
                      $el.find('img').first().attr('data-src') || '';
    const rating = $el.find('.rating').text().replace('Rating:', '').trim();
    const year = $el.find('.year').text().trim();
    const tags = [];
    $el.find('.sgeneros a').each((_, t) => {
      const tag = $(t).text().trim();
      if (tag) tags.push(tag);
    });

    if (title && link) videos.push({ title, link, thumbnail, rating, year, tags });
  });

  return videos;
}

async function scrapeHentaiList() {
  const $ = await fetchPage('https://hentaimama.io/hentai-list/');
  const sections = [];

  $('.list_wrap_inner').children().each((i, el) => {
    const $el = $(el);
    if (el.tagName === 'span' && $el.hasClass('the_letter')) {
      const letter = $el.text().replace(/\s+/g, '').slice(0, 1) || '#';
      sections.push({ letter, items: [] });
    } else if (el.tagName === 'ul' && sections.length) {
      $el.find('li a').each((j, a) => {
        const title = $(a).attr('title') || $(a).text().trim();
        const link = $(a).attr('href') || '';
        if (title && link) {
          sections[sections.length - 1].items.push({ title, link });
        }
      });
    }
  });

  return sections.filter(s => s.items.length > 0);
}

async function scrapeEpisode(url) {
  // Fetch raw HTML first so we can extract postId via regex immediately
  const html = await fetchPageRaw(url);

  // Robust postId extraction via multiple patterns
  const postId =
    html.match(/["']?miana_post_id["']?\s*:\s*["']?(\d+)["']?/)?.[1] ||
    html.match(/a:\s*['"](\d+)['"]/)?.[1] ||
    html.match(/postid-(\d+)/)?.[1] ||
    html.match(/["']post_id["']\s*:\s*["']?(\d+)["']?/)?.[1] ||
    html.match(/var\s+postId\s*=\s*['"]?(\d+)['"]?/)?.[1] ||
    html.match(/data-post-id=["'](\d+)["']/)?.[1] ||
    html.match(/\?p=(\d+)/)?.[1] ||
    null;

  if (!postId) {
    // Last ditch: check if it's in a link rel="shortlink"
    const $ = cheerio.load(html);
    const shortlink = $('link[rel="shortlink"]').attr('href');
    if (shortlink) {
      const m = shortlink.match(/\?p=(\d+)/);
      if (m) console.log(`[scrapeEpisode] Found postId via shortlink: ${m[1]}`);
    }
  }

  // Debug log in backend if postId not found
  if (!postId) console.warn(`[scrapeEpisode] postId not found for ${url}`);

  const nonceMatch = html.match(/"nonce"\s*:\s*"([a-f0-9]+)"/);
  const nonce = nonceMatch ? nonceMatch[1] : '';

  // Parse DOM
  const $ = cheerio.load(html);

  const title = $('meta[property="og:title"]').attr('content') ||
    $('.sbox .data h1').first().text().trim() || 'No Title';

  const genres = [];
  $('.sgeneros a').each((_, el) => {
    const t = $(el).text().trim();
    const slug = $(el).attr('href')?.split('/genre/')[1]?.replace(/\/$/, '') || '';
    if (t) genres.push({ name: t, slug });
  });

  const screenshots = [];
  $('.galeria .g-item').each((_, el) => {
    // Prefer the <a href> which always has the real URL, fallback to img src/data-src
    const src =
      $(el).find('a').attr('href') ||
      $(el).find('img').attr('src') ||
      $(el).find('img').attr('data-src') || '';
    if (src && !src.startsWith('data:')) screenshots.push(src.trim());
  });

  const episodes = [];
  $('ul.episodios li').each((_, el) => {
    const $el = $(el);
    const link = $el.find('.episodiotitle a').attr('href') || $el.find('a').first().attr('href') || '';
    const epTitle = $el.find('.episodiotitle a').text().trim();
    const date = $el.find('.date').text().trim();
    const thumb = $el.find('img').attr('data-src') || $el.find('noscript img').attr('src') || '';
    const cleanLink = link.replace(/\?player=.*$/, '');
    if (cleanLink) episodes.push({ epTitle, link: cleanLink, date, thumb });
  });

  let prevEp = '';
  let nextEp = '';
  $('.pag_episodes .item').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a');
    // Skip disabled buttons (class="nonex" or no href)
    if ($a.hasClass('nonex') || !$a.attr('href')) return;
    const href = $a.attr('href');
    if (!href || !href.includes('/episodes/')) return;
    const text = $el.text().trim().toLowerCase();
    if (text.includes('next')) nextEp = href;
    else if (text.includes('prev')) prevEp = href;
  });
  const seriesLink = $('.pag_episodes a[href*="/tvshows/"]').attr('href') || '';
  const thumbnail = $('meta[property="og:image"]').attr('content') || '';

  // Per-episode cover (portrait)
  const seriesCover =
    $('.episode-series-img img').attr('data-src') ||
    $('.episode-series-img img').attr('src') || '';

  // Rating & votes
  const rating = $('.dt_rating_vgs').text().trim() || $('.rating-box .dt_rating_vgs').text().trim() || '';
  const votes = $('.votes').text().trim().replace(/[^0-9]/g, '') || '';

  // Studio & aired on
  let studio = '';
  let airedOn = '';
  $('.sbox .data .custom_fields, .sbox .data p, .custom_fields').each((_, el) => {
    const text = $(el).text();
    if (/studio/i.test(text)) {
      studio = $(el).find('a').first().text().trim() || $(el).text().replace(/studio[:\s]*/i, '').trim();
    }
    if (/aired/i.test(text)) {
      airedOn = $(el).text().replace(/aired\s*on[:\s]*/i, '').trim();
    }
  });
  // fallback selectors
  if (!studio) {
    $('.sbox .data').find('*').each((_, el) => {
      const $el = $(el);
      if (/studio/i.test($el.text()) && $el.find('a').length) {
        studio = $el.find('a').first().text().trim();
      }
    });
  }
  // Fetch similar titles
  const similarPromise = seriesLink
    ? axios.get(`${WORKER_URL}?url=${encodeURIComponent(seriesLink.replace('https://', 'http://'))}`, { timeout: 10000, httpsAgent: agent })
        .then(r => {
          const $s = cheerio.load(r.data);
          const similar = [];
          $s('.sbox').each((_, el) => {
            if (!/similar/i.test($s(el).find('h2,h3,.title').first().text())) return;
            $s(el).find('article, .item, li').each((__, item) => {
              const link = $s(item).find('a').attr('href') || '';
              const thumb = $s(item).find('img').attr('data-src') || $s(item).find('img').attr('src') || '';
              const title = $s(item).find('img').attr('alt') || $s(item).find('a').text().trim();
              const rating = $s(item).find('.rating').text().replace(/[^\d.]/g, '').trim();
              if (link && thumb && !thumb.startsWith('data:')) similar.push({ title, link, thumbnail: thumb, rating });
            });
          });
          return similar;
        })
        .catch(() => [])
    : Promise.resolve([]);

  // Fetch similar titles
  const similarTitles = await similarPromise;

  let playerSrcs = [];

  // Attempt AJAX retrieval via direct HTTPS request using DoH
  if (postId && nonce) {
    try {
      const resDns = await axios.get(`https://8.8.8.8/resolve?name=hentaimama.io&type=A`, { headers: { 'Accept': 'application/json' }, timeout: 5000 });
      const ip = resDns.data.Answer.find(a => a.type === 1)?.data;
      if (ip) {
        const body = `action=get_player_contents&a=${postId}&nonce=${nonce}`;
        const rx = await axios.post(`https://${ip}/wp-admin/admin-ajax.php`, body, {
          headers: {
            'Host': 'hentaimama.io',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': url.replace('http://', 'https://'),
            'Origin': 'https://hentaimama.io'
          },
          httpsAgent: agent,
          timeout: 10000
        });
        
        if (rx.data && Array.isArray(rx.data)) {
          for (let idx = 0; idx < rx.data.length; idx++) {
            const item = rx.data[idx];
            if (!item) continue;
            const iframeMatch = item.match(/<iframe.*?src=["'](.*?)["']/);
            if (iframeMatch) {
              const srcUrl = iframeMatch[1];
              let addedMp4 = false;
              const isNewProxy = srcUrl.includes('new2.php') || srcUrl.includes('newjav.php') || srcUrl.includes('new.php');
              if (isNewProxy) {
                try {
                  const new2Res = await axios.get(`${WORKER_URL}?url=${encodeURIComponent(srcUrl.replace('https://', 'http://'))}`, {
                    headers: { 'Referer': 'https://hentaimama.io/' },
                    httpsAgent: agent, timeout: 10000
                  });
                  const mp4Match = String(new2Res.data).match(/file\s*:\s*["']([^"']+)["']/i);
                  if (mp4Match) {
                    const mp4Url = mp4Match[1];
                    playerSrcs.push({
                      option: idx + 1,
                      src: mp4Url,
                      proxySrc: `/api/video?url=${encodeURIComponent(mp4Url)}`,
                      type: 'mp4'
                    });
                    addedMp4 = true;
                  }
                } catch (e) {
                  console.warn('[scrapeEpisode] new2.php extract error:', e.message);
                }
              }
              if (!addedMp4) {
                playerSrcs.push({
                  option: idx + 1,
                  src: srcUrl,
                  proxySrc: `/api/video?mode=proxy&url=${encodeURIComponent(srcUrl)}`,
                  type: 'iframe'
                });
              }
            }
          }
        }
      }
    } catch(e) {
      console.warn('[scrapeEpisode] AJAX Player error:', e.message);
    }
  }

  // Brute-force find MP4 via new2.php: try all A-Z prefixes with slug-derived filename
  // Format: new2.php?p=base64("PREFIX/filename.mp4") → gdvid.info/PREFIX/filename.mp4
  if (playerSrcs.length === 0 && url) {
    try {
      const epSlug = url.replace(/\/$/, '').split('/').pop();
      const epNum = epSlug.match(/episode-(\d+)$/)?.[1] || epSlug.match(/-(\d+)$/)?.[1] || '1';
      const baseName = epSlug.replace(/-episode-\d+$/, '').replace(/-\d+$/, '');
      // Strip common Japanese particles that hentaimama sometimes omits in filenames
      const baseNameStripped = baseName.replace(/-(to|no|wa|ga|de|na|wo|mo|ni|he|ka|yo|ne|sa|ze|zo|ba|te|shi|su|ku|nu|ru|mu|fu|pu|bu|gu|zu|du|bu)-/g, '-').replace(/--+/g, '-');

      // Extract actual filename from screenshot URLs (most reliable source)
      // e.g. /uploads/2026/04/my-title-1.mp4_snapshot_... → my-title-1.mp4
      const screenshotFilename = screenshots.length > 0
        ? screenshots[0].match(/\/([^/]+\.mp4)_snapshot/i)?.[1] || null
        : null;

      const filenameVariants = [
        screenshotFilename,                          // from screenshot URL (most accurate)
        `${baseNameStripped}-${epNum}.mp4`,          // stripped particles
        `${baseName}-${epNum}.mp4`,
        `${epSlug}.mp4`,
        `${baseName}-episode-${epNum}.mp4`,
        `${baseNameStripped}-episode-${epNum}.mp4`,
      ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); // remove nulls + dedupe

      const PREFIXES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

      // Try prefix A first (fast path), then brute force if needed
      outer: for (const filename of filenameVariants) {
        // Fast path: try prefix A first
        const fastResult = await (async () => {
          const path = `A/${filename}`;
          const p = Buffer.from(path).toString('base64');
          try {
            const r = await axios.get(
              `${WORKER_URL}?url=${encodeURIComponent(`http://hentaimama.io/new2.php?p=${p}`)}`,
              { timeout: 6000, httpsAgent: agent }
            );
            const mp4 = String(r.data).match(/file\s*:\s*["']([^"']+)["']/i);
            if (!mp4 || !mp4[1].includes('gdvid.info')) return null;
            const mp4Url = mp4[1];
            // Verify file exists — always verify regardless of filename source
            let verified = false;
            try {
              // Verify via worker HEAD (worker now properly forwards HEAD method)
              const wv = await axios.head(
                `${WORKER_URL}?url=${encodeURIComponent(mp4Url.replace('https://', 'http://'))}`,
                { timeout: 5000, httpsAgent: agent, validateStatus: s => s === 200 || s === 404 }
              );
              verified = wv.status === 200;
            } catch(e) {}
            if (!verified) return null;
            return { prefix: 'A', path, src: mp4Url };
          } catch(e) {}
          return null;
        })();

        if (fastResult) {
          playerSrcs = [{ option: 1, src: fastResult.src, proxySrc: `/api/video?url=${encodeURIComponent(fastResult.src)}`, type: 'mp4' }];
          break outer;
        }

        // Slow path: brute force all prefixes
        const batchSize = 6;
        for (let i = 0; i < PREFIXES.length; i += batchSize) {
          const batch = PREFIXES.slice(i, i + batchSize);
          const results = await Promise.all(batch.map(async (prefix) => {
            const path = `${prefix}/${filename}`;
            const p = Buffer.from(path).toString('base64');
            try {
              const r = await axios.get(
                `${WORKER_URL}?url=${encodeURIComponent(`http://hentaimama.io/new2.php?p=${p}`)}`,
                { timeout: 6000, httpsAgent: agent }
              );
              const mp4 = String(r.data).match(/file\s*:\s*["']([^"']+)["']/i);
              if (!mp4) return null;
              const mp4Url = mp4[1];
              if (!mp4Url.includes('gdvid.info')) return null;
              // Always verify — new2.php returns a URL regardless of whether file exists
              const wv = await axios.head(
                `${WORKER_URL}?url=${encodeURIComponent(mp4Url.replace('https://', 'http://'))}`,
                { timeout: 4000, httpsAgent: agent, validateStatus: s => s === 200 || s === 404 }
              );
              if (wv.status !== 200) return null;
              return { prefix, path, src: mp4Url };
            } catch(e) {}
            return null;
          }));

          // Take only the first valid result — multiple prefixes for same file is redundant
          const found = results.filter(Boolean);
          if (found.length > 0) {
            playerSrcs = [{
              option: 1,
              src: found[0].src,
              proxySrc: `/api/video?url=${encodeURIComponent(found[0].src)}`,
              type: 'mp4'
            }];
            break outer;
          }
        }
      }
    } catch(e) {}

    // Fallback: Puppeteer service (handles AJAX that WordPress blocks from servers)
    if (playerSrcs.length === 0 && PUPPET_URL && PUPPET_KEY && postId) {
      try {
        const r = await axios.get(`${PUPPET_URL}/player`, {
          params: { postId, epUrl: url },
          headers: { 'x-api-key': PUPPET_KEY },
          timeout: 40000,
        });
        if (r.data?.success && Array.isArray(r.data.srcs)) {
          playerSrcs = r.data.srcs.map(s => ({
            ...s,
            proxySrc: `/api/video?url=${encodeURIComponent(s.src)}`,
          }));
        }
      } catch(e) {}
    }
  }

  return { title, genres, screenshots, episodes, prevEp, nextEp, seriesLink, thumbnail, seriesCover, playerSrcs, url, rating, votes, studio, airedOn, similarTitles, postId };
}

async function scrapeDetail(url) {
  const $ = await fetchPage(url);

  const title = $('.sheader .data h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') || 'No Title';

  const genres = [];
  $('.sgeneros a').each((_, el) => {
    const name = $(el).text().trim();
    const slug = $(el).attr('href')?.split('/genre/')[1]?.replace(/\/$/, '') || '';
    if (name) genres.push({ name, slug });
  });

  const thumbnail =
    $('.sheader .poster img').attr('data-src') ||
    $('.sheader .poster img').attr('src') ||
    $('meta[property="og:image"]').attr('content') || '';

  const description = $('.wp-content p').first().text().trim() ||
    $('.sinopsis p').first().text().trim() || '';

  const rating = $('.dt_rating_vgs').text().trim() || '';
  const votes = $('.votes span').first().text().trim() || '';

  // Custom fields
  let studio = '', firstAir = '', lastAir = '', status = '', episodeCount = '', originalTitle = '';
  $('.sheader .data .custom_fields b, .sheader .data b').each((_, el) => {
    const label = $(el).text().trim();
    const val = $(el).next('span, a, div').text().trim() || $(el).parent().text().replace(label, '').trim();
    if (/studio/i.test(label)) studio = $(el).parent().find('a, span').first().text().trim() || val;
    if (/first air/i.test(label)) firstAir = val;
    if (/last air/i.test(label)) lastAir = val;
    if (/status/i.test(label)) status = val;
    if (/episodes/i.test(label)) episodeCount = val;
    if (/original title/i.test(label)) originalTitle = val;
  });

  // Episodes list
  const episodes = [];
  $('#episodes article').each((_, el) => {
    const $el = $(el);
    const link = $el.find('a').first().attr('href') || '';
    const epTitle = $el.find('.data h3').text().trim().replace(/\s+/g, ' ');
    const date = $el.find('.data span').first().text().trim();
    const thumb = $el.find('.poster img').attr('data-src') || $el.find('.poster noscript img').attr('src') || '';
    const seriesTitle = $el.find('.poster img').attr('alt') || '';
    const badge = $el.find('.status-sub').text().trim() ? 'SUB' : $el.find('.status-unc').text().trim() ? 'UNC' : '';
    const rating = $el.find('.rating').text().replace(/[^\d.]/g, '').trim();
    if (link) episodes.push({ epTitle, link, date, thumb, seriesTitle, badge, rating });
  });

  return { title, genres, thumbnail, description, rating, votes, studio, firstAir, lastAir, status, episodeCount, originalTitle, episodes, url };
}

module.exports = { scrapeHome, scrapeList, scrapeHentaiList, scrapeSearch, scrapeEpisode, scrapeDetail, scrapeStudiosAndYears, scrapeRelease, scrapeStudio };

function buildPagedUrl(base, page) {
  if (page && page > 1) return `${base}page/${page}/`;
  return base;
}

async function scrapeRelease(year, page) {
  const url = buildPagedUrl(`https://hentaimama.io/release/${year}/`, page);
  return await scrapeList(url);
}

async function scrapeStudio(slug, page) {
  const url = buildPagedUrl(`https://hentaimama.io/studio/${slug}/`, page);
  return await scrapeList(url);
}

async function scrapeStudiosAndYears() {
  const $ = await fetchPage('https://hentaimama.io/advance-search/');
  const studios = [];
  $('#lstStudios option').each((_, el) => {
    const name = $(el).text().trim();
    if (name) studios.push(name);
  });
  const years = [];
  $('#lstYears option').each((_, el) => {
    const y = $(el).attr('value') || $(el).text().trim();
    if (y) years.push(y);
  });
  return { studios, years };
}
