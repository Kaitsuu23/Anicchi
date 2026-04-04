const GENRES = [
  { name: '3D', slug: '3d' }, { name: 'Action', slug: 'action' }, { name: 'Adventure', slug: 'adventure' },
  { name: 'Ahegao', slug: 'ahegao' }, { name: 'Anal', slug: 'anal' }, { name: 'Animal Girls', slug: 'animal-ears' },
  { name: 'BDSM', slug: 'bdsm' }, { name: 'Blackmail', slug: 'blackmail' }, { name: 'Blowjob', slug: 'blowjob' },
  { name: 'Bondage', slug: 'bondage' }, { name: 'Brainwashed', slug: 'brainwashed' }, { name: 'Bukakke', slug: 'bukakke' },
  { name: 'Cat Girl', slug: 'cat-girl' }, { name: 'Comedy', slug: 'comedy' }, { name: 'Cosplay', slug: 'cosplay' },
  { name: 'Creampie', slug: 'creampie' }, { name: 'Dark Skin', slug: 'dark-skin' }, { name: 'Domination', slug: 'domination' },
  { name: 'Double Penetration', slug: 'double-penatration' }, { name: 'Drama', slug: 'drama' }, { name: 'Ecchi', slug: 'ecchi' },
  { name: 'Elf', slug: 'elf' }, { name: 'Facial', slug: 'facial' }, { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Femdom', slug: 'femdom' }, { name: 'Footjob', slug: 'footjob' }, { name: 'Futanari', slug: 'futanari' },
  { name: 'Gangbang', slug: 'gangbang' }, { name: 'Gyaru', slug: 'gyaru' }, { name: 'Harem', slug: 'harem' },
  { name: 'Housewife', slug: 'housewife' }, { name: 'Humiliation', slug: 'humiliation' }, { name: 'Lactation', slug: 'lactation' },
  { name: 'Large Breasts', slug: 'large-breasts' }, { name: 'Maid', slug: 'maid' }, { name: 'Megane', slug: 'megane' },
  { name: 'MILF', slug: 'milf' }, { name: 'Mind Break', slug: 'mind-break' }, { name: 'Molestation', slug: 'molestation' },
  { name: 'NTR', slug: 'ntr' }, { name: 'Nurses', slug: 'nurses' }, { name: 'Office Ladies', slug: 'office-ladies' },
  { name: 'POV', slug: 'pov' }, { name: 'Pregnant', slug: 'pregnant' }, { name: 'Public Sex', slug: 'public-sex' },
  { name: 'Rape', slug: 'rape' }, { name: 'Romance', slug: 'romance' }, { name: 'School Girls', slug: 'school-girls' },
  { name: 'Step Daughter', slug: 'step-daughter' }, { name: 'Step Mother', slug: 'step-mother' },
  { name: 'Step Sister', slug: 'step-sister' }, { name: 'Stocking', slug: 'stocking' }, { name: 'Succubus', slug: 'succubus' },
  { name: 'Swimsuit', slug: 'swimsuit' }, { name: 'Tentacles', slug: 'tentacles' }, { name: 'Tits Fuck', slug: 'tits-fuck' },
  { name: 'Toys', slug: 'toys' }, { name: 'Uncensored', slug: 'uncensored' }, { name: 'Vanilla', slug: 'vanilla' },
  { name: 'Virgins', slug: 'virgins' }, { name: 'X-Ray', slug: 'x-ray' }, { name: 'Yuri', slug: 'yuri' },
];

const YEARS = [];
for (let y = 2026; y >= 2000; y--) {
  YEARS.push({ name: y.toString(), url: `https://hentaimama.io/release/${y}/` });
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const genres = GENRES.map(g => ({ name: g.name, url: `https://hentaimama.io/genre/${g.slug}/` }));
  res.json({ success: true, data: genres, years: YEARS });
};
