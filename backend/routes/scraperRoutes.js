const express = require('express');
const router = express.Router();
const { home, list, hentaiList, newMonthly, recentEpisodes, search, episode, detail, genres, genre, release, studio, topRated } = require('../controllers/scraperController');

router.get('/home', home);
router.get('/list', list);
router.get('/hentai-list', hentaiList);
router.get('/monthly', newMonthly);
router.get('/recent-episodes', recentEpisodes);
router.get('/search', search);
router.get('/episode', episode);
router.get('/detail', detail);
router.get('/genres', genres);
router.get('/genre/:slug', genre);
router.get('/releases/:year', release);
router.get('/studio/:slug', studio);
router.get('/toprated', topRated);

module.exports = router;
