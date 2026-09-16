const { getHomeVideos, getListVideos, getHentaiList, getNewMonthly, getRecentEpisodes, getSearchResults, getEpisodeData, getVideoDetail, getReleaseVideos, getStudioVideos, getGenreVideos, getTopRated, getGenres } = require('../services/scraperService');

async function genres(req, res) {
  try {
    const data = await getGenres();
    const formattedGenres = data.genres.map(g => ({
      name: g.name,
      url: `https://hentaimama.io/genre/${g.slug}/`
    }));
    const formattedStudios = data.studios.map(s => ({
      name: s.name,
      url: `https://hentaimama.io/studio/${s.slug}/`
    }));
    const formattedYears = data.years.map(y => ({
      name: y.name,
      url: `https://hentaimama.io/release/${y.year}/`
    }));
    res.json({ success: true, genres: formattedGenres, studios: formattedStudios, years: formattedYears });
  } catch (err) {
    console.error('[/api/genres]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function home(req, res) {
  try {
    const data = await getHomeVideos();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/home]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function list(req, res) {
  const { page, filter } = req.query;
  const pageNum = page ? parseInt(page) : 1;
  
  // Valid filter options
  const validFilters = ['recent', 'rating', 'alphabet', 'weekly', 'monthly', 'alltime'];
  
  // Build URL
  let baseUrl = pageNum > 1 ? `https://hentaimama.io/hentai-series/page/${pageNum}/` : 'https://hentaimama.io/hentai-series/';
  
  // Only add filter parameter if explicitly requested and not alphabet (default)
  let url = baseUrl;
  if (filter && validFilters.includes(filter) && filter !== 'alphabet') {
    url = `${baseUrl}?filter=${filter}`;
  }
  
  console.log('[/api/list] url:', url);
  try {
    const data = await getListVideos(url);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/list]', err.message, '| url:', url);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function hentaiList(req, res) {
  try {
    const data = await getHentaiList();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/hentai-list]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function newMonthly(req, res) {
  const { page } = req.query;
  const pageNum = page ? parseInt(page) : 1;
  try {
    const data = await getNewMonthly(pageNum);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/monthly]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function recentEpisodes(req, res) {
  const { page } = req.query;
  const pageNum = page ? parseInt(page) : 1;
  try {
    const data = await getRecentEpisodes(pageNum);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/recent-episodes]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function search(req, res) {
  const { q, page } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Parameter q diperlukan.' });
  try {
    const data = await getSearchResults(q, page ? parseInt(page) : 1);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/search]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function detail(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, message: 'Parameter url diperlukan.' });
  try {
    const data = await getVideoDetail(url);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/detail]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function episode(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, message: 'Parameter url diperlukan.' });
  try {
    const data = await getEpisodeData(url);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/episode]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function release(req, res) {
  const { year } = req.params;
  const { page, filter } = req.query;
  if (!year) return res.status(400).json({ success: false, message: 'Year diperlukan.' });
  try {
    const data = await getReleaseVideos(year, page ? parseInt(page) : 1, filter);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function studio(req, res) {
  const { slug } = req.params;
  const { page, filter } = req.query;
  if (!slug) return res.status(400).json({ success: false, message: 'Slug diperlukan.' });
  try {
    const data = await getStudioVideos(slug, page ? parseInt(page) : 1, filter);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function genre(req, res) {
  const { slug } = req.params;
  const { page, filter } = req.query;
  if (!slug) return res.status(400).json({ success: false, message: 'Slug diperlukan.' });
  try {
    const data = await getGenreVideos(slug, page ? parseInt(page) : 1, filter);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function topRated(req, res) {
  const tab = req.query.tab || 'monthly';
  const page = parseInt(req.query.page) || 1;
  const validTabs = ['monthly', '3d', 'uncensored'];
  if (!validTabs.includes(tab)) {
    return res.status(400).json({ success: false, message: 'Invalid tab. Use: monthly, 3d, uncensored' });
  }
  try {
    const data = await getTopRated(tab, page);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[/api/toprated]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { home, list, hentaiList, newMonthly, recentEpisodes, search, episode, detail, genres, genre, release, studio, topRated };
