const { scrapeHome, scrapeList, scrapeHentaiList, scrapeNewMonthly, scrapeRecentEpisodes, scrapeSearch, scrapeEpisode, scrapeDetail, scrapeRelease, scrapeStudio, scrapeGenre, scrapeTopRated, scrapeGenres } = require('../scraper');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = {
  episode: 0,   // Disabled cache untuk development
  detail:  0,   // Disabled cache untuk development
  home:    0,   // Disabled cache untuk development
  list:    0,   // Disabled cache untuk development
  search:   0,   // Disabled cache untuk development
  hentai:  0,   // Disabled cache untuk development
};

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data, ttl) {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

async function getHomeVideos() {
  const key = 'home';
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeHome();
  setCache(key, data, CACHE_TTL.home);
  return data;
}

async function getListVideos(url) {
  if (!url || !url.startsWith('http')) throw new Error('URL tidak valid.');
  const key = `list:${url}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeList(url);
  // Remove date, badge, epBadge from list responses
  data.videos = data.videos.map(v => {
    const { date, badge, epBadge, ...rest } = v;
    return rest;
  });
  setCache(key, data, CACHE_TTL.list);
  return data;
}

async function getHentaiList() {
  const key = 'hentai-list';
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeHentaiList();
  setCache(key, data, CACHE_TTL.hentai);
  return data;
}

async function getNewMonthly(page) {
  const key = `new-monthly:${page || 1}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeNewMonthly(page);
  setCache(key, data, CACHE_TTL.list);
  return data;
}

async function getRecentEpisodes(page) {
  const key = `recent-episodes:${page || 1}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeRecentEpisodes(page);
  setCache(key, data, CACHE_TTL.list);
  return data;
}

async function getSearchResults(query, page = 1) {
  if (!query) throw new Error('Query diperlukan.');
  const key = `search:${query}:${page}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeSearch(query, page);
  setCache(key, data, CACHE_TTL.search);
  return data;
}

async function getEpisodeData(url) {
  if (!url || !url.startsWith('http')) throw new Error('URL tidak valid.');
  const normalizedUrl = url.replace(/\/$/, '') + '/';
  const key = `episode:${normalizedUrl}`;
  const cached = getCache(key);
  if (cached) {
    console.log('[cache hit] episode:', normalizedUrl);
    return cached;
  }
  console.log('[cache miss] episode:', normalizedUrl);
  const data = await scrapeEpisode(normalizedUrl);
  setCache(key, data, CACHE_TTL.episode);
  return data;
}

async function getVideoDetail(url) {
  if (!url || !url.startsWith('http')) throw new Error('URL tidak valid.');
  const key = `detail:${url}`;
  const cached = getCache(key);
  if (cached) {
    console.log('[cache hit] detail:', url);
    return cached;
  }
  const data = await scrapeDetail(url);
  setCache(key, data, CACHE_TTL.detail);
  return data;
}

async function getReleaseVideos(year, page, filter) {
  const key = `release:${year}:${page || 1}:${filter || 'alltime'}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeRelease(year, page, filter);
  // Remove date, badge, epBadge from release detail responses
  data.videos = data.videos.map(v => {
    const { date, badge, epBadge, ...rest } = v;
    return rest;
  });
  setCache(key, data, CACHE_TTL.list);
  return data;
}

async function getStudioVideos(slug, page, filter) {
  const key = `studio:${slug}:${page || 1}:${filter || 'alltime'}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeStudio(slug, page, filter);
  // Remove date, badge, epBadge from studio detail responses
  data.videos = data.videos.map(v => {
    const { date, badge, epBadge, ...rest } = v;
    return rest;
  });
  setCache(key, data, CACHE_TTL.list);
  return data;
}

async function getGenreVideos(slug, page, filter) {
  const key = `genre:${slug}:${page || 1}:${filter || 'alltime'}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeGenre(slug, page, filter);
  // Remove date, badge, epBadge from genre detail responses
  data.videos = data.videos.map(v => {
    const { date, badge, epBadge, ...rest } = v;
    return rest;
  });
  setCache(key, data, CACHE_TTL.list);
  return data;
}

async function getTopRated(tab, page) {
  const key = `toprated:${tab}:${page}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeTopRated(tab, page);
  setCache(key, data, 10 * 60 * 1000); // 10 menit
  return data;
}

async function getGenres() {
  const data = await scrapeGenres();
  return data;
}

module.exports = { getHomeVideos, getListVideos, getHentaiList, getNewMonthly, getRecentEpisodes, getSearchResults, getEpisodeData, getVideoDetail, getReleaseVideos, getStudioVideos, getGenreVideos, getTopRated, getGenres };
