const { scrapeHome, scrapeList, scrapeHentaiList, scrapeSearch, scrapeEpisode, scrapeDetail, scrapeStudiosAndYears, scrapeRelease, scrapeStudio } = require('../scraper');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = {
  episode: 30 * 60 * 1000,   // 30 menit
  detail:  30 * 60 * 1000,   // 30 menit
  home:    10 * 60 * 1000,   // 10 menit
  list:    10 * 60 * 1000,   // 10 menit
  search:   5 * 60 * 1000,   // 5 menit
  hentai:  60 * 60 * 1000,   // 60 menit
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

async function getSearchResults(query) {
  if (!query) throw new Error('Query diperlukan.');
  const key = `search:${query}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeSearch(query);
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

async function getStudiosAndYears() {
  const key = 'studios-years';
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeStudiosAndYears();
  setCache(key, data, 60 * 60 * 1000); // 1 jam
  return data;
}

async function getReleaseVideos(year, page) {
  const key = `release:${year}:${page || 1}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeRelease(year, page);
  setCache(key, data, CACHE_TTL.list);
  return data;
}

async function getStudioVideos(slug, page) {
  const key = `studio:${slug}:${page || 1}`;
  const cached = getCache(key);
  if (cached) return cached;
  const data = await scrapeStudio(slug, page);
  setCache(key, data, CACHE_TTL.list);
  return data;
}

module.exports = { getHomeVideos, getListVideos, getHentaiList, getSearchResults, getEpisodeData, getVideoDetail, getStudiosAndYears, getReleaseVideos, getStudioVideos };
