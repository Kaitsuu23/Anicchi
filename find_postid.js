const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

async function check() {
  const url = 'http://hentaimama.io/episodes/1ldk-jk-ikinari-doukyo-micchaku-hatsu-ecchi-episode-1/';
  try {
    const r = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, httpsAgent: agent, timeout: 15000 });
    const text = r.data;
    const m1 = text.match(/a:'(\d+)'/);
    const m2 = text.match(/a:"(\d+)"/);
    const m3 = text.match(/a:\s*['"](\d+)['"]/);
    console.log('m1:', m1 ? m1[1] : 'no');
    console.log('m2:', m2 ? m2[1] : 'no');
    console.log('m3:', m3 ? m3[1] : 'no');

    // Search for a: anywhere
    let idx = text.indexOf('a:');
    if (idx !== -1) {
      console.log('context:', text.substring(idx, idx + 100));
    } else {
      console.log('a: not found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
