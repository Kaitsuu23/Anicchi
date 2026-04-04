require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://hentaimama.io';
const WORKER_URL = process.env.CF_WORKER_URL;

async function fetchPageRaw(url) {
  const res = await axios.get(`${WORKER_URL}?url=${encodeURIComponent(url)}`, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
  });
  return res.data;
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
  // Jika URL punya query params (letter filter), strip page dari path saja
  if (url.includes('?')) {
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.replace(/\/page\/\d+\/?/, '/');
    basePageUrl = urlObj.toString();
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

  // Extract postId via regex (faster than waiting for DOM parse)
  const postIdMatch = html.match(/a:'(\d+)'/);
  const postId = postIdMatch ? postIdMatch[1] : null;

  // Fire AJAX in parallel while we parse the DOM below
  const ajaxUrl = 'https://hentaimama.io/wp-admin/admin-ajax.php';
  const ajaxPromise = postId
    ? axios.post(
        `${WORKER_URL}?url=${encodeURIComponent(ajaxUrl)}`,
        `action=get_player_contents&a=${postId}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': url,
            'X-Requested-With': 'XMLHttpRequest',
          },
          timeout: 15000,
        }
      ).catch(() => null)
    : Promise.resolve(null);

  // Parse DOM while AJAX is in-flight
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
    if (src && !src.startsWith('data:')) screenshots.push(src);
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
    // "Next Ep" di site = episode lebih lama = yang kita sebut NEXT (nomor lebih tinggi)
    // "Previous Ep" di site = episode lebih baru = yang kita sebut PREV (nomor lebih rendah)
    // Tapi ternyata website ini: Next = episode berikutnya (nomor lebih tinggi), Previous = sebelumnya
    // Dari inspect: episode 1 → Next Ep = episode 2. Jadi Next di site = Next di kita.
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
  // Await AJAX result + fetch similar titles from series page in parallel
  let playerSrcs = [];
  const similarPromise = seriesLink
    ? axios.get(`${WORKER_URL}?url=${encodeURIComponent(seriesLink)}`, { timeout: 10000 })
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

  const [ajaxRes, similarTitles] = await Promise.all([ajaxPromise, similarPromise]);
  if (ajaxRes) {
    try {
      // Limit to first 2 options
      const players = (Array.isArray(ajaxRes.data) ? ajaxRes.data : JSON.parse(ajaxRes.data)).slice(0, 2);
      const $c = require('cheerio');

      const extractPromises = players.map(async (playerHtml, i) => {
        const $p = $c.load(playerHtml);
        const iframeSrc = $p('iframe').attr('src') || '';
        if (!iframeSrc) return null;

        try {
          const playerPage = await axios.get(`${WORKER_URL}?url=${encodeURIComponent(iframeSrc)}`, { timeout: 10000 });
          const mp4Match = playerPage.data.match(/file:\s*["']([^"']+\.mp4[^"']*)["']/i) ||
                           playerPage.data.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
          if (mp4Match) {
            return { option: i + 1, src: mp4Match[1] || mp4Match[0], type: 'mp4' };
          }
        } catch (e) {
          // skip
        }
        return null;
      });

      const results = await Promise.all(extractPromises);
      playerSrcs = results.filter(r => r !== null);
    } catch (e) { /* AJAX gagal */ }
  }

  return { title, genres, screenshots, episodes, prevEp, nextEp, seriesLink, thumbnail, seriesCover, playerSrcs, url, rating, votes, studio, airedOn, similarTitles };
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
