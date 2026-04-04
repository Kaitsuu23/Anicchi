const { scrapeStudiosAndYears } = require('../lib/scraper');
const { getCache, setCache } = require('../lib/cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const key = 'studios-years';
    let data = getCache(key);
    if (!data) { data = await scrapeStudiosAndYears(); setCache(key, data, 60 * 60 * 1000); }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
