const { scrapeStudio } = require('../lib/scraper');
const { getCache, setCache } = require('../lib/cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const slug = req.query.slug || req.url?.split('/').pop()?.split('?')[0];
  const page = parseInt(req.query.page) || 1;
  if (!slug) return res.status(400).json({ success: false, message: 'slug diperlukan' });
  try {
    const key = `studio:${slug}:${page}`;
    let data = getCache(key);
    if (!data) { data = await scrapeStudio(slug, page); setCache(key, data, 10 * 60 * 1000); }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
