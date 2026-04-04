const { getHomeVideos, getListVideos, getHentaiList, getSearchResults, getEpisodeData, getVideoDetail, getStudiosAndYears, getReleaseVideos, getStudioVideos } = require('../services/scraperService');

// Genre list dengan slug langsung dari situs
const GENRES = [
  { name: '3D', slug: '3d' },
  { name: 'Action', slug: 'action' },
  { name: 'Adventure', slug: 'adventure' },
  { name: 'Ahegao', slug: 'ahegao' },
  { name: 'Anal', slug: 'anal' },
  { name: 'Animal Girls', slug: 'animal-ears' },
  { name: 'BDSM', slug: 'bdsm' },
  { name: 'Blackmail', slug: 'blackmail' },
  { name: 'Blowjob', slug: 'blowjob' },
  { name: 'Bondage', slug: 'bondage' },
  { name: 'Brainwashed', slug: 'brainwashed' },
  { name: 'Bukakke', slug: 'bukakke' },
  { name: 'Cat Girl', slug: 'cat-girl' },
  { name: 'Comedy', slug: 'comedy' },
  { name: 'Condom', slug: 'condom' },
  { name: 'Cosplay', slug: 'cosplay' },
  { name: 'Creampie', slug: 'creampie' },
  { name: 'Cross-dressing', slug: 'cross-dressing' },
  { name: 'Cute & Funny', slug: 'cutefunny' },
  { name: 'Dark Skin', slug: 'dark-skin' },
  { name: 'DeepThroat', slug: 'deepthroat' },
  { name: 'Demons', slug: 'demons' },
  { name: 'Doctor', slug: 'doctor' },
  { name: 'Domination', slug: 'domination' },
  { name: 'Double Penetration', slug: 'double-penatration' },
  { name: 'Drama', slug: 'drama' },
  { name: 'Dubbed', slug: 'dubbed' },
  { name: 'Ecchi', slug: 'ecchi' },
  { name: 'Elf', slug: 'elf' },
  { name: 'Eroge', slug: 'eroge' },
  { name: 'Facesitting', slug: 'facesitting' },
  { name: 'Facial', slug: 'facial' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Female Doctor', slug: 'female-doctor' },
  { name: 'Female Teacher', slug: 'female-teacher' },
  { name: 'Femdom', slug: 'femdom' },
  { name: 'Footjob', slug: 'footjob' },
  { name: 'Furry', slug: 'furry' },
  { name: 'Futanari', slug: 'futanari' },
  { name: 'Gangbang', slug: 'gangbang' },
  { name: 'Gyaru', slug: 'gyaru' },
  { name: 'Harem', slug: 'harem' },
  { name: 'Historical', slug: 'historical' },
  { name: 'Horny Slut', slug: 'horny-slut' },
  { name: 'Housewife', slug: 'housewife' },
  { name: 'Humiliation', slug: 'humiliation' },
  { name: 'Inflation', slug: 'inflation' },
  { name: 'Internal Cumshot', slug: 'internal-cumshot' },
  { name: 'Lactation', slug: 'lactation' },
  { name: 'Large Breasts', slug: 'large-breasts' },
  { name: 'Magical Girls', slug: 'magical-girls' },
  { name: 'Maid', slug: 'maid' },
  { name: 'Martial Arts', slug: 'martial-arts' },
  { name: 'Megane', slug: 'megane' },
  { name: 'MILF', slug: 'milf' },
  { name: 'Mind Break', slug: 'mind-break' },
  { name: 'Molestation', slug: 'molestation' },
  { name: 'Non-Japanese', slug: 'non-japanese' },
  { name: 'NTR', slug: 'ntr' },
  { name: 'Nuns', slug: 'nuns' },
  { name: 'Nurses', slug: 'nurses' },
  { name: 'Office Ladies', slug: 'office-ladies' },
  { name: 'Orc', slug: 'orc' },
  { name: 'Police', slug: 'police' },
  { name: 'POV', slug: 'pov' },
  { name: 'Pregnant', slug: 'pregnant' },
  { name: 'Princess', slug: 'princess' },
  { name: 'Public Sex', slug: 'public-sex' },
  { name: 'Rape', slug: 'rape' },
  { name: 'Rim job', slug: 'rim-job' },
  { name: 'Romance', slug: 'romance' },
  { name: 'Scat', slug: 'scat' },
  { name: 'School Girls', slug: 'school-girls' },
  { name: 'Sci-Fi', slug: 'sci-fi' },
  { name: 'Shimapan', slug: 'shimapan' },
  { name: 'Short', slug: 'short' },
  { name: 'Shoutacon', slug: 'shoutacon' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Squirting', slug: 'squirting' },
  { name: 'Step Daughter', slug: 'step-daughter' },
  { name: 'Step Mother', slug: 'step-mother' },
  { name: 'Step Sister', slug: 'step-sister' },
  { name: 'Stocking', slug: 'stocking' },
  { name: 'Strap-on', slug: 'strap-on' },
  { name: 'Succubus', slug: 'succubus' },
  { name: 'Super Power', slug: 'super-power' },
  { name: 'Supernatural', slug: 'supernatural' },
  { name: 'Swimsuit', slug: 'swimsuit' },
  { name: 'Tentacles', slug: 'tentacles' },
  { name: 'Three some', slug: 'three-some' },
  { name: 'Tits Fuck', slug: 'tits-fuck' },
  { name: 'Toys', slug: 'toys' },
  { name: 'Train Molestation', slug: 'train-molestation' },
  { name: 'Tsundere', slug: 'tsundere' },
  { name: 'Uncensored', slug: 'uncensored' },
  { name: 'Urination', slug: 'urination' },
  { name: 'Vampire', slug: 'vampire' },
  { name: 'Vanilla', slug: 'vanilla' },
  { name: 'Virgins', slug: 'virgins' },
  { name: 'Widow', slug: 'widow' },
  { name: 'X-Ray', slug: 'x-ray' },
  { name: 'Yuri', slug: 'yuri' },
];

function genres(req, res) {
  const data = GENRES.map(g => ({
    name: g.name,
    url: `https://hentaimama.io/genre/${g.slug}/`
  }));
  res.json({ success: true, data });
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
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, message: 'Parameter url diperlukan.' });
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

async function search(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Parameter q diperlukan.' });
  try {
    const data = await getSearchResults(q);
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

async function studiosAndYears(req, res) {
  try {
    const data = await getStudiosAndYears();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function release(req, res) {
  const { year } = req.params;
  const { page } = req.query;
  if (!year) return res.status(400).json({ success: false, message: 'Year diperlukan.' });
  try {
    const data = await getReleaseVideos(year, page ? parseInt(page) : 1);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function studio(req, res) {
  const { slug } = req.params;
  const { page } = req.query;
  if (!slug) return res.status(400).json({ success: false, message: 'Slug diperlukan.' });
  try {
    const data = await getStudioVideos(slug, page ? parseInt(page) : 1);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { home, list, hentaiList, search, episode, detail, genres, studiosAndYears, release, studio };
