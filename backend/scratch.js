const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://hentaimama.io/page/2/?s=kanojo', {headers: {'User-Agent': 'Mozilla/5.0'}})
  .then(res => {
    const $ = cheerio.load(res.data);
    console.log($('.pagination').html() || $('.nav-links').html());
  })
  .catch(console.error);
