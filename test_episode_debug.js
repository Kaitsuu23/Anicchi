const { scrapeEpisode } = require('./lib/scraper');

async function test() {
  const url = 'https://hentaimama.io/episodes/kegareboshi-ova-episode-4/';
  try {
    const result = await scrapeEpisode(url);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
