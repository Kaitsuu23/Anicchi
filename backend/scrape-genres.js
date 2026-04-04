require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const WORKER = process.env.CF_WORKER_URL;

async function main() {
  console.log('Fetching genres from advance-search...\n');
  const res = await axios.get(`${WORKER}?url=${encodeURIComponent('https://hentaimama.io/genres-filter/')}`, { timeout: 20000 });
  const $ = cheerio.load(res.data);

  const genres = [];

  // Cari semua genre links
  $('a[href*="/genre/"]').each((i, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    if (name && href.includes('/genre/')) {
      const slug = href.replace('https://hentaimama.io/genre/', '').replace(/\/$/, '');
      if (slug && !genres.find(g => g.slug === slug)) {
        genres.push({ name, slug, url: href });
      }
    }
  });

  if (!genres.length) {
    // Fallback: cari dari select options di advance-search
    const res2 = await axios.get(`${WORKER}?url=${encodeURIComponent('https://hentaimama.io/advance-search/')}`, { timeout: 20000 });
    const $2 = cheerio.load(res2.data);
    $2('#lstGenres option').each((i, el) => {
      const name = $2(el).text().trim();
      const val = $2(el).attr('value') || '';
      if (name && val) {
        const slug = val.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/--+/g, '-');
        genres.push({ name, slug });
      }
    });
  }

  console.log('Found', genres.length, 'genres:\n');
  console.log(JSON.stringify(genres, null, 2));

  // Output format untuk GENRE_SLUG_MAP
  console.log('\n=== SLUG MAP ===');
  genres.forEach(g => {
    console.log(`  '${g.name}': '${g.slug}',`);
  });
}

main().catch(e => console.error('ERROR:', e.message));
