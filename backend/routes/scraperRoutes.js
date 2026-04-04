const express = require('express');
const router = express.Router();
const { home, list, hentaiList, search, episode, detail, genres, studiosAndYears, release, studio } = require('../controllers/scraperController');

router.get('/home', home);
router.get('/list', list);
router.get('/hentai-list', hentaiList);
router.get('/search', search);
router.get('/episode', episode);
router.get('/detail', detail);
router.get('/genres', genres);
router.get('/studios-years', studiosAndYears);
router.get('/release/:year', release);
router.get('/studio/:slug', studio);

module.exports = router;
