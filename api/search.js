const { scrapeSearch } = require('../lib/scraper');
const { getCache, setCache } = require('../lib/cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'q diperlukan' });
  try {
    const key = `search:${q}`;
    let data = getCache(key);
    if (!data) { data = await scrapeSearch(q); setCache(key, data, 5 * 60 * 1000); }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
