const { scrapeRelease } = require('../lib/scraper');
const { getCache, setCache } = require('../lib/cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const year = req.query.year || req.url?.split('/').pop()?.split('?')[0];
  const page = parseInt(req.query.page) || 1;
  if (!year) return res.status(400).json({ success: false, message: 'year diperlukan' });
  try {
    const key = `release:${year}:${page}`;
    let data = getCache(key);
    if (!data) { data = await scrapeRelease(year, page); setCache(key, data, 10 * 60 * 1000); }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
