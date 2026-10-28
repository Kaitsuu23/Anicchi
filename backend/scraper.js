const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const BASE_URL = 'http://hentaimama.io';
const WORKER_URL = process.env.CF_WORKER_URL;

// Agent untuk mengabaikan error SSL expired dari target
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
agent.setMaxListeners(100);
require('events').EventEmitter.defaultMaxListeners = 100;

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
    // Silently fallback to direct request
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
    const image = $el.find('.image');
    const scLeft = $el.find('.sc-left'); // genre list structure

    // Thumbnail
    const thumbnail =
      poster.find('img').attr('src') ||
      poster.find('img').attr('data-src') ||
      image.find('img').attr('src') ||
      image.find('img').attr('data-src') ||
      scLeft.find('img').attr('src') ||
      scLeft.find('img').attr('data-src') ||
      $el.find('img').first().attr('src') || '';

    // Link
    const link =
      poster.find('a[href]').attr('href') ||
      image.find('a[href]').attr('href') ||
      scLeft.find('a.sc-poster[href]').attr('href') ||
      data.find('a[href]').attr('href') ||
      $el.find('a[href]').first().attr('href') || '';

    // Title
    const title =
      data.find('h3 a').text().trim() ||
      data.find('h3.title').text().trim() ||
      data.find('h3').text().trim() ||
      image.find('h3.title').text().trim() ||
      $el.find('.sc-title a, .sc-title').first().text().trim() ||
      $el.find('h3 a, h3').first().text().trim() ||
      poster.find('span.serie').text().trim() ||
      scLeft.find('img').attr('alt') || '';

    // Date
    const date =
      data.find('.card-tags .tag').first().text().trim() ||
      data.find('span').first().text().trim() ||
      $el.find('.sc-date, [class*="date"]').first().text().trim() || '';

    // Badge
    const badge =
      data.find('.tag-sub').text().trim() ||
      data.find('.tag-unc').text().trim() ||
      poster.find('.status-sub').text().trim() ||
      poster.find('.status-unc').text().trim() || '';

    // Rating
    const rating = $el.find('.rating, .sc-btn-rating').text().replace(/[^\d.]/g, '').trim() || '';

    // Episode badge
    const epBadge = poster.find('.dt-ep-badge').text().trim() || '';

    // Old fallback
    const seasonLink = poster.find('.season_m a').attr('href') || '';
    const finalLink = seasonLink || link;

    if (title && finalLink) {
      // Filter out ads — only allow hentaimama.io links
      if (!finalLink.includes('hentaimama.io')) return;
      videos.push({ title, episodeTitle: title, link: finalLink, thumbnail, badge, rating, date, epBadge });
    }
  });
  return videos;
}

function parsePopItems($, container) {
  const videos = [];
  container.find('.dt-pop-item').each((i, el) => {
    const $el = $(el);
    const link = $el.attr('data-href') || $el.find('a').first().attr('href') || '';
    const thumbnail = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
    const title = $el.find('.dt-pop-title').text().trim() || $el.find('img').first().attr('alt') || '';
    const date = $el.find('.dt-pop-date, .dt-pop-meta, [class*="date"]').text().trim() || '';
    const badge = $el.find('[class*="tag-sub"]').text().trim() || $el.find('[class*="tag-unc"]').text().trim() || '';
    const rating = $el.find('[class*="rating"], [class*="score"]').text().replace(/[^\d.]/g, '').trim() || '';
    if (title && link) {
      // Filter out ads
      if (!link.includes('hentaimama.io')) return;
      videos.push({ title, episodeTitle: title, link, thumbnail, badge, rating, date, epBadge: '' });
    }
  });
  return videos;
}

/**
 * Extract quality label dari URL video
 * Contoh: "1080p", "720p", "480p", "360p", "HLS", "MP4"
 */
function extractQuality(url, type) {
  if (!url) return '';
  const m = url.match(/(\d{3,4}p)/i);
  if (m) return m[1].toLowerCase(); // "1080p", "720p", dll
  if (type === 'hls') return 'HLS';
  return '';
}

async function scrapeHome() {
  const $ = await fetchPage(BASE_URL);
  const sections = [];

  // ── Section 1: Top Rated — fetch tiap tab dari data-links ──
  const dtRat = $('#dt-rat-1, .dt-rat').first();
  if (dtRat.length > 0) {
    // Monthly tab sudah ada di HTML
    const activeGrid = dtRat.find('.dt-rat-grid').first();
    const monthlyVideos = parseArticles($, activeGrid.length ? activeGrid : dtRat);
    if (monthlyVideos.length > 0) {
      sections.push({ section: 'Top Rated Monthly', seeAll: 'https://hentaimama.io/new-monthly-hentai/', videos: monthlyVideos });
    }

    // 3D & Uncensored — fetch dari URL di data-links
    let tabLinks = {};
    try { tabLinks = JSON.parse(dtRat.find('.dt-rat-all').attr('data-links') || '{}'); } catch (e) {}

    const tabDefs = [
      { key: '3d', label: 'Top Rated 3D' },
      { key: 'uncensored', label: 'Top Rated Uncensored' },
    ];

    await Promise.all(tabDefs.map(async ({ key, label }) => {
      const url = tabLinks[key];
      if (!url) { console.warn(`[scrapeHome] No URL for tab: ${key}`); return; }
      try {
        const html = await fetchPageRaw(url);
        const $t = cheerio.load(html);
        const tabContainer = $t('.items, [class*="items"], #archive-content').first();
        const tabVideos = parseArticles($t, tabContainer.length && tabContainer.find('article').length ? tabContainer : $t('body'));
        console.log(`[scrapeHome] tab ${key}: found ${tabVideos.length} videos`);
        if (tabVideos.length > 0) {
          sections.push({ section: label, seeAll: url, videos: tabVideos.slice(0, 12) });
        }
      } catch (e) {
        console.warn(`[scrapeHome] tab ${key} failed:`, e.message);
      }
    }));
  }

  // ── Section 2: Recently Added (.dt-rp-added via .dt-pop-item) ──
  const recentContainer = $('.dt-rp-added, #dt-rp-added-1, .dt-rp').first();
  if (recentContainer.length > 0) {
    const recentTitle = recentContainer.find('.dt-pop-heading').text().trim() || 'Recently Added';
    const recentSeeAll = recentContainer.find('.dt-pop-seeall').attr('href') || '';
    const recentVideos = parsePopItems($, recentContainer);
    if (recentVideos.length > 0) {
      sections.push({ section: recentTitle, seeAll: recentSeeAll, videos: recentVideos });
    }
  }

  // ── Fallback: old .content_center structure ──
  if (sections.length === 0) {
    const wrapper = $('div.content_center');
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
  }

  return sections;
}

async function scrapeList(url) {
  const $ = await fetchPage(url);
  const videos = [];

  $('article.series-card').each((i, el) => {
    const $el = $(el);
    
    // For hentai-series page structure
    const scPoster = $el.find('.sc-poster');
    const posterImg = scPoster.find('img');
    const thumbnail = posterImg.attr('src') || posterImg.attr('data-src') || '';
    const link = scPoster.attr('href') || '';

    const heading = $el.find('h3').first();
    const title = heading.text().trim();
    
    const rating = $el.find('.sc-btn-rating').text().trim();
    
    // Get studios
    const studios = [];
    $el.find('.sc-tag-studio').each((j, studioEl) => {
      studios.push($(studioEl).text().trim());
    });
    
    // Get genres
    const genres = [];
    $el.find('.sc-genres a').each((j, genreEl) => {
      genres.push($(genreEl).text().trim());
    });
    
    // Get date from sc-meta content
    const metaContent = $el.find('.sc-meta').text();
    const dateMatch = metaContent.match(/([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/);
    const date = dateMatch ? dateMatch[1] : '';

    // Get year from year badge or sc-meta
    const year =
      $el.find('.dt-sc-ribbon-year').text().trim() ||
      $el.find('.sc-tag-year').text().trim() ||
      $el.find('.tag-year').text().trim() ||
      metaContent.match(/\b(19|20)\d{2}\b/)?.[0] ||
      $el.find('.sc-meta .sc-tag').filter(function() {
        return $(this).text().trim().match(/^\d{4}$/);
      }).text().trim() ||
      '';

    // Get badge (SUB/UNC/RAW) - try multiple selectors
    const badge =
      $el.find('.dt-sc-ribbon-sub').text().trim() ||
      $el.find('.dt-sc-ribbon-unc').text().trim() ||
      $el.find('.dt-sc-ribbon-raw').text().trim() ||
      $el.find('.sc-tag-sub, .sc-tag-unc, .sc-tag-raw').text().trim() ||
      $el.find('.tag-sub, .tag-unc, .tag-raw').text().trim() ||
      $el.find('.status-sub, .status-unc, .status-raw').text().trim() ||
      $el.find('[class*="tag-sub"], [class*="tag-unc"], [class*="tag-raw"]').text().trim() ||
      scPoster.find('.tag-sub, .tag-unc, .tag-raw, .status-sub, .status-unc, .status-raw').text().trim() ||
      $el.find('.poster .tag-sub, .poster .tag-unc, .poster .tag-raw').text().trim() ||
      '';

    // Get episode badge (EP 2, etc)
    const epBadge = $el.find('.dt-ep-badge').text().trim() || '';

    if (title && link) {
      if (!link.includes('hentaimama.io')) return;
      videos.push({ 
        title, 
        link, 
        thumbnail, 
        rating, 
        studios,
        genres, 
        date,
        year,
        badge,
        epBadge
      });
    }
  });

  // Pagination — extract semua page numbers + last page
  const pages = [];
  const seen = new Set();

  $('.pagination a, .nav-links a, .page-numbers a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (href && !seen.has(href)) {
      seen.add(href);
      // Extract page number from href for text display
      const pageMatch = href.match(/\/page\/(\d+)\/?/);
      const pageText = pageMatch ? pageMatch[1] : text;
      pages.push({ text: pageText, href });
    }
  });

  // Cari last page number dari link terakhir
  let lastPage = 1;

  pages.forEach(p => {
    const m = p.href.match(/\/page\/(\d+)\/?/);
    if (m) lastPage = Math.max(lastPage, parseInt(m[1]));
  });

  // Cari current page dari URL
  const currentMatch = url.match(/\/page\/(\d+)\/?/);
  const currentPage = currentMatch ? parseInt(currentMatch[1]) : 1;

  return { videos, pages, currentPage, lastPage };
}

async function scrapeSearch(query, page = 1) {
  const url = page === 1 
    ? `https://hentaimama.io/?s=${encodeURIComponent(query)}`
    : `https://hentaimama.io/page/${page}/?s=${encodeURIComponent(query)}`;
  
  const $ = await fetchPage(url);
  const videos = [];

  $('article').each((i, el) => {
    const $el = $(el);
    const link = $el.find('a').first().attr('href') || '';
    const title = $el.find('.sc-title a').first().text().trim() ||
                  $el.find('h3 a').first().text().trim() ||
                  $el.find('img').first().attr('alt') || '';
    const thumbnail = $el.find('img').first().attr('src') ||
                      $el.find('img').first().attr('data-src') || '';
    
    // Extrack year from the first sc-tag in sc-meta (excluding studios)
    let year = $el.find('.sc-meta').not('.sc-meta-studios').find('.sc-tag').first().text().trim();
    if (!/^\d{4}$/.test(year)) {
        year = ''; // Ensure it's a valid year
    }
    
    // Extract rating
    const rating = $el.find('.sc-btn-rating').text().trim() || 
                   $el.find('.rating').text().replace('Rating:', '').trim();

    if (title && link) {
      if (!link.includes('hentaimama.io')) return;
      videos.push({ title, link, thumbnail, year, rating });
    }
  });

  // Extract last page
  let lastPage = 1;
  $('.pagination a, .nav-links a, .page-numbers a').each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href') || '';
    const pageMatch = href.match(/\/page\/(\d+)\/?/);
    const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : parseInt(text, 10);
    if (!isNaN(pageNum) && pageNum > lastPage) {
      lastPage = pageNum;
    }
  });

  // Fallback: check current page text (e.g. "2/ 2")
  const curPageText = $('.dt-pg-cur, .current').first().text();
  const match = curPageText.match(/\/\s*(\d+)/);
  if (match) {
    const pageNum = parseInt(match[1], 10);
    if (pageNum > lastPage) {
      lastPage = pageNum;
    }
  }

  // Also ensure lastPage is at least the current requested page if results are found
  if (videos.length > 0 && page > lastPage) {
    lastPage = page;
  }

  return { videos, lastPage };
}

async function scrapeNewMonthly(page = 1) {
  const url = page === 1
    ? 'https://hentaimama.io/new-monthly-hentai/'
    : `https://hentaimama.io/new-monthly-hentai/page/${page}/`;
  return scrapeList(url);
}

async function scrapeRecentEpisodes(page = 1) {
  const url = page === 1
    ? 'https://hentaimama.io/recent-episodes/'
    : `https://hentaimama.io/recent-episodes/page/${page}/`;
  const $ = await fetchPage(url);
  const videos = parseArticles($, $('body'));

  // Pagination — extract semua page numbers + last page
  const pages = [];
  const seen = new Set();

  $('.pagination a, .nav-links a, .page-numbers a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (href && !seen.has(href)) {
      seen.add(href);
      // Extract page number from href for text display
      const pageMatch = href.match(/\/page\/(\d+)\/?/);
      const pageText = pageMatch ? pageMatch[1] : text;
      pages.push({ text: pageText, href });
    }
  });

  // Cari last page number dari link terakhir
  let lastPage = 1;

  pages.forEach(p => {
    const m = p.href.match(/\/page\/(\d+)\/?/);
    if (m) lastPage = Math.max(lastPage, parseInt(m[1]));
  });

  // Cari current page dari URL
  const currentMatch = url.match(/\/page\/(\d+)\/?/);
  const currentPage = currentMatch ? parseInt(currentMatch[1]) : 1;

  return { videos, pages, currentPage, lastPage };
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
      if (m) postId = m[1];
    }
  }

  // Debug log in backend if postId not found
  if (!postId) console.warn(`[scrapeEpisode] postId not found for ${url}`);

  const nonceMatch = html.match(/"nonce"\s*:\s*"([a-f0-9]+)"/);
  const nonce = nonceMatch ? nonceMatch[1] : '';

  // Parse DOM
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') || 'No Title';

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
  $('.dt-se-item').each((_, el) => {
    const $el = $(el);
    const link = $el.attr('href') || '';
    const content = $el.text().trim();
    
    const epNumMatch = content.match(/EP\s+(\d+)/);
    const epNum = epNumMatch ? epNumMatch[1] : '';
    
    const date = $el.find('.dt-se-date').text().trim() || '';
    
    const thumb = $el.find('img').attr('src') || '';
    
    if (link) episodes.push({ epNum, link, thumb, date });
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

  // Rating
  const rating = $('.dt_rating_vgs').text().trim() || $('.rating-box .dt_rating_vgs').text().trim() || '';

  // Studio & aired on - get from series detail page
  let studio = '';
  let airedOn = '';
  if (seriesLink) {
    try {
      const seriesRes = await axios.get(`${WORKER_URL}?url=${encodeURIComponent(seriesLink.replace('https://', 'http://'))}`, { timeout: 10000, httpsAgent: agent });
      const $s = cheerio.load(seriesRes.data);
      $s('.dsc-stat').each((_, el) => {
        const $el = $(el);
        const label = $el.find('span').text().trim();
        const value = $el.find('b').text().trim();
        if (label === 'Studio') {
          studio = $el.find('b a').text().trim() || value;
        } else if (label === 'Aired') {
          airedOn = value;
        }
      });
    } catch(e) {}
  }
  // Fetch similar titles
  const similarPromise = seriesLink
    ? axios.get(`${WORKER_URL}?url=${encodeURIComponent(seriesLink.replace('https://', 'http://'))}`, { timeout: 10000, httpsAgent: agent })
        .then(r => {
          const $s = cheerio.load(r.data);
          const similar = [];
          $s('.ep-sim-card').each((_, el) => {
            const $el = $(el);
            const link = $el.attr('href') || '';
            const thumb = $el.find('img').attr('src') || '';
            const titleText = $el.find('h3').text().trim();
            const ratingMatch = titleText.match(/(\d+\.?\d*)$/);
            const rating = ratingMatch ? ratingMatch[1] : '';
            const title = titleText.replace(/\d+\.?\d*$/, '').trim();
            if (link && thumb) similar.push({ title, link, thumbnail: thumb, rating });
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
              const isNewProxy = srcUrl.includes('new1.php') || srcUrl.includes('new2.php') || srcUrl.includes('newjav.php') || srcUrl.includes('new.php');
              if (isNewProxy) {
                try {
                  const newRes = await axios.get(`${WORKER_URL}?url=${encodeURIComponent(srcUrl.replace('https://', 'http://'))}`, {
                    headers: { 'Referer': 'https://hentaimama.io/' },
                    httpsAgent: agent, timeout: 10000
                  });
                  const pageData = String(newRes.data);

                  // Try HLS (.m3u8) first — usually from new1.php
                  const hlsMatch = pageData.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) ||
                                   pageData.match(/source\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) ||
                                   pageData.match(/["'](https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)["']/i);
                  if (hlsMatch) {
                    let hlsUrl = hlsMatch[1];
                    // If relative, resolve against new1.php base
                    if (!hlsUrl.startsWith('http')) {
                      const newBase = srcUrl.substring(0, srcUrl.lastIndexOf('/') + 1);
                      hlsUrl = newBase + hlsUrl;
                    }
                    playerSrcs.push({
                      option: idx + 1,
                      src: hlsUrl,
                      proxySrc: `/api/video?url=${encodeURIComponent(hlsUrl)}`,
                      type: 'hls',
                      quality: extractQuality(hlsUrl, 'hls')
                    });
                    addedMp4 = true;
                  }

                  // Fallback: try mp4 — usually from new2.php
                  if (!addedMp4) {
                    const mp4Match = pageData.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i) ||
                                     pageData.match(/["'](https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)["']/i);
                    if (mp4Match) {
                      const mp4Url = mp4Match[1];
                      playerSrcs.push({
                        option: idx + 1,
                        src: mp4Url,
                        proxySrc: `/api/video?url=${encodeURIComponent(mp4Url)}`,
                        type: 'mp4',
                        quality: extractQuality(mp4Url, 'mp4')
                      });
                      addedMp4 = true;
                    }
                  }

                  if (!addedMp4) {
                    console.warn(`[scrapeEpisode] No media URL found in ${srcUrl}, page snippet: ${pageData.substring(0, 300)}`);
                  }
                } catch (e) {
                  console.warn('[scrapeEpisode] newX.php extract error:', e.message);
                }
              }
              if (!addedMp4) {
                // For non-new proxy iframes, fetch the page and extract video URL
                try {
                  const decodedSrcUrl = srcUrl.replace(/&#038;/g, '&');
                  const iframeRes = await axios.get(decodedSrcUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    httpsAgent: agent,
                    timeout: 10000
                  });
                  const iframeData = String(iframeRes.data);
                  
                  // Try to extract video URL from JWPlayer or other player configs
                  const jwMatch = iframeData.match(/sources\s*:\s*\[\s*\{\s*"file"\s*:\s*"([^"]+)"/i) ||
                                  iframeData.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*['"]([^'"]+)['"]/i);
                  const hlsMatch = iframeData.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
                  const mp4Match = iframeData.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
                  
                  let videoUrl = null;
                  let videoType = null;
                  
                  if (jwMatch) {
                    videoUrl = jwMatch[1].replace(/\\/g, '');
                    videoType = videoUrl.includes('.m3u8') ? 'hls' : 'mp4';
                  } else if (hlsMatch) {
                    videoUrl = hlsMatch[1];
                    videoType = 'hls';
                  } else if (mp4Match) {
                    videoUrl = mp4Match[1];
                    videoType = 'mp4';
                  }
                  
                  if (videoUrl) {
                    playerSrcs.push({
                      option: idx + 1,
                      src: videoUrl,
                      proxySrc: `/api/video?url=${encodeURIComponent(videoUrl)}`,
                      type: videoType,
                      quality: extractQuality(videoUrl, videoType)
                    });
                    addedMp4 = true;
                  } else {
                    playerSrcs.push({
                      option: idx + 1,
                      src: srcUrl,
                      proxySrc: `/api/video?mode=proxy&url=${encodeURIComponent(srcUrl)}`,
                      type: 'iframe'
                    });
                  }
                } catch (e) {
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
          playerSrcs = [{ option: 1, src: fastResult.src, proxySrc: `/api/video?url=${encodeURIComponent(fastResult.src)}`, type: 'mp4', quality: extractQuality(fastResult.src, 'mp4') }];
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
              type: 'mp4',
              quality: extractQuality(found[0].src, 'mp4')
            }];
            break outer;
          }
        }
      }
    } catch(e) {}


  }

  // Deteksi "Coming Soon" — hanya kalau playerSrcs kosong DAN ada marker spesifik di player area
  const playerAreaHtml = $('body').find('.mian-item-player, #dt-player, .player-embed, [class*="player"]').first().html() || '';
  const playerAreaText = $('body').find('.mian-item-player, #dt-player, .player-embed, [class*="player"]').first().text().trim();
  const isComingSoon = playerSrcs.length === 0 && (
    /coming\s*soon/i.test(playerAreaText) ||
    /coming\s*soon/i.test(playerAreaHtml) ||
    $('body').find('[class*="coming-soon"], .coming-soon').length > 0
  );

  return { title, seriesLink, seriesCover, thumbnail, genres, playerSrcs, screenshots, episodes, prevEp, nextEp, similarTitles, postId, rating, studio, airedOn, comingSoon: isComingSoon };
}

async function scrapeDetail(url) {
  const $ = await fetchPage(url);

  const title = $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') || 'No Title';

  const altTitle = $('.dsc-alt').text().trim() || '';

  const genres = [];
  const genreSet = new Set();
  $('a[href*="/genre/"]').each((_, el) => {
    const name = $(el).text().trim();
    const slug = $(el).attr('href')?.split('/genre/')[1]?.replace(/\/$/, '') || '';
    if (name && !genreSet.has(slug)) {
      genreSet.add(slug);
      genres.push({ name, slug });
    }
  });

  const thumbnail =
    $('.dsc-poster img').attr('src') ||
    $('.dsc-poster').css('background-image')?.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1') ||
    $('meta[property="og:image"]').attr('content') ||
    '';

  const description = $('.dsc-desc').first().text().trim() || '';

  const rating = $('.dt_rating_vgs').text().trim() || '';

  // Extract metadata from dsc-stats
  let studio = '', studioSlug = '', aired = '', episodeCount = '';
  $('.dsc-stat').each((_, el) => {
    const $el = $(el);
    const label = $el.find('span').text().trim();
    const value = $el.find('b').text().trim();

    if (label === 'Studio') {
      studio = $el.find('b a').text().trim() || value;
      studioSlug = $el.find('b a').attr('href')?.split('/studio/')[1]?.replace(/\/$/, '') || '';
    } else if (label === 'Aired') {
      aired = value;
    } else if (label === 'Episodes') {
      episodeCount = value;
    }
  });

  // Episodes list
  const episodes = [];
  $('.dt-se-item').each((_, el) => {
    const $el = $(el);
    const link = $el.attr('href') || '';
    const content = $el.text().trim();
    
    // Extract episode number and rating from content
    const epNumMatch = content.match(/EP\s+(\d+)/);
    const epNum = epNumMatch ? epNumMatch[1] : '';
    
    const ratingMatch = content.match(/(\d+\.\d+)/);
    const epRating = ratingMatch ? ratingMatch[1] : '';
    
    const thumb = $el.find('img').attr('src') || '';
    
    if (link) episodes.push({ epNum, link, thumb, rating: epRating });
  });

  // Related/Similar titles
  const related = [];
  $('.ep-sim-card').each((_, el) => {
    const $el = $(el);
    const link = $el.attr('href') || '';
    const titleText = $el.find('h3').text().trim();
    const ratingMatch = titleText.match(/(\d+\.?\d*)$/);
    const rating = ratingMatch ? ratingMatch[1] : '';
    const title = titleText.replace(/\d+\.?\d*$/, '').trim();
    
    const thumbnail = $el.find('img').attr('src') || '';
    
    const metaText = $el.find('.ep-sim-meta').text().trim();
    const yearMatch = metaText.match(/^(\d{4})/);
    const year = yearMatch ? yearMatch[1] : '';
    const viewsMatch = metaText.match(/\d{4}(\d+k views)/);
    const views = viewsMatch ? viewsMatch[1] : '';
    const episodesMatch = metaText.match(/(\d+ Episodes)$/);
    const epCount = episodesMatch ? episodesMatch[1] : '';
    
    if (link) related.push({ title, link, thumbnail, rating, year, episodes: epCount });
  });

  return { title, altTitle, thumbnail, description, genres, rating, studio, studioSlug, aired, episodeCount, episodes, related };
}

async function scrapeTopRated(tab, page) {
  const validTabs = ['monthly', '3d', 'uncensored'];
  if (!validTabs.includes(tab)) throw new Error('Invalid tab');
  const per = 12;

  const ajaxUrl = `https://hentaimama.io/wp-admin/admin-ajax.php?action=dt_rat&tab=${encodeURIComponent(tab)}&page=${page}&per=${per}`;
  const res = await fetchPageRaw(ajaxUrl);
  const d = typeof res === 'string' ? JSON.parse(res) : res;
  const $ = cheerio.load(d.html || '');
  const videos = parseArticles($, $('body'));

  return {
    tab,
    page: d.page || page,
    hasNext: d.has_next === true,
    videos,
  };
}

module.exports = { scrapeHome, scrapeList, scrapeNewMonthly, scrapeRecentEpisodes, scrapeHentaiList, scrapeSearch, scrapeEpisode, scrapeDetail, scrapeRelease, scrapeStudio, scrapeGenre, scrapeTopRated, scrapeGenres };

function buildPagedUrl(base, page) {
  if (page && page > 1) return `${base}page/${page}/`;
  return base;
}

async function scrapeRelease(year, page, filter) {
  const baseUrl = buildPagedUrl(`https://hentaimama.io/release/${year}/`, page);
  const validFilters = ['recent', 'rating', 'alphabet', 'weekly', 'monthly', 'alltime'];
  let url = baseUrl;
  if (filter && validFilters.includes(filter) && filter !== 'alltime') {
    url = `${baseUrl}?filter=${filter}`;
  }
  return await scrapeList(url);
}

async function scrapeStudio(slug, page, filter) {
  // Use the slug as-is (it should already be the correct format from the API)
  const baseUrl = buildPagedUrl(`https://hentaimama.io/studio/${slug}/`, page);
  const validFilters = ['recent', 'rating', 'alphabet', 'weekly', 'monthly', 'alltime'];
  let url = baseUrl;
  if (filter && validFilters.includes(filter) && filter !== 'alltime') {
    url = `${baseUrl}?filter=${filter}`;
  }
  return await scrapeList(url);
}

async function scrapeGenre(slug, page, filter) {
  const baseUrl = buildPagedUrl(`https://hentaimama.io/genre/${slug}/`, page);
  const validFilters = ['recent', 'rating', 'alphabet', 'weekly', 'monthly', 'alltime'];
  let url = baseUrl;
  if (filter && validFilters.includes(filter) && filter !== 'alltime') {
    url = `${baseUrl}?filter=${filter}`;
  }
  return await scrapeList(url);
}

async function scrapeGenres() {
  const $ = await fetchPage('https://hentaimama.io/genres-filter/');
  
  const genres = [];
  $('a[href*="/genre/"]').each((i, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    if (name && href.includes('/genre/')) {
      const slug = href.replace('https://hentaimama.io/genre/', '').replace(/\/$/, '');
      if (slug && !genres.find(g => g.slug === slug)) {
        genres.push({ name, slug, url: href });
      }
    }
  });
  
  // Sort genres alphabetically by name
  genres.sort((a, b) => a.name.localeCompare(b.name));
  
  const studios = [];
  // Extract studios from actual studio links on the page
  $('a[href*="/studio/"]').each((i, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    if (name && href.includes('/studio/')) {
      const slug = href.replace('https://hentaimama.io/studio/', '').replace(/\/$/, '');
      if (slug && !studios.find(s => s.slug === slug)) {
        studios.push({ name, slug, url: href });
      }
    }
  });
  
  // Sort studios alphabetically
  studios.sort((a, b) => a.name.localeCompare(b.name));
  
  const years = [];
  $('select[name="years_filter[]"] option').each((i, el) => {
    const value = $(el).attr('value');
    const name = $(el).text().trim();
    if (value && name) {
      years.push({ name, year: value });
    }
  });
  
  // Sort years descending
  years.sort((a, b) => parseInt(b.year) - parseInt(a.year));
  
  return { genres, studios, years };
}
