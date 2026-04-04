require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const WORKER = process.env.CF_WORKER_URL;

async function main() {
  const url = 'https://hentaimama.io/episodes/15-bishoujo-hyouryuuki-episode-1/';
  const res = await axios.get(`${WORKER}?url=${encodeURIComponent(url)}`, { timeout: 20000 });
  const $ = cheerio.load(res.data);

  console.log('=== .pag_episodes full HTML ===');
  console.log($('.pag_episodes').html());

  console.log('\n=== Each .item ===');
  $('.pag_episodes .item').each((i, el) => {
    const $el = $(el);
    console.log(`\n[item ${i}]`);
    console.log('  text:', $el.text().trim());
    console.log('  html:', $el.html()?.trim().slice(0, 300));
    console.log('  a href:', $el.find('a').attr('href'));
    console.log('  a class:', $el.find('a').attr('class'));
    console.log('  classes on item:', $el.attr('class'));
  });
}
main().catch(e => console.error(e.message));
