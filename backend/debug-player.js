require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const https = require('https');

async function test(postId, epUrl) {
  return new Promise((resolve) => {
    const url = `https://henmama-player-production.up.railway.app/player?postId=${postId}&epUrl=${encodeURIComponent(epUrl)}`;
    https.get(url, { headers: { 'x-api-key': 'ecchizone123' } }, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { console.log(`[${postId}]`, r.statusCode, d.slice(0, 300)); resolve(); });
    }).on('error', e => { console.log('err:', e.message); resolve(); });
  });
}

async function main() {
  console.log('Testing Railway Puppeteer service...');
  await test('15043', 'https://hentaimama.io/episodes/kegareboshi-ova-episode-4/');
  await test('15043', 'https://hentaimama.io/episodes/natsu-to-hako-episode-2/');
}

main();
