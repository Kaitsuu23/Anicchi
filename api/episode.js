const { scrapeEpisode } = require('../lib/scraper');
const { getCache, setCache } = require('../lib/cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, message: 'url diperlukan' });
  try {
    const key = `episode:${url}`;
    let data = getCache(key);
    if (!data) { data = await scrapeEpisode(url); setCache(key, data, 30 * 60 * 1000); }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
