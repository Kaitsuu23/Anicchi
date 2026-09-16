# EcchiZone

Backend-only scraper API for hentaimama.io. Scrapes and provides data for hentai series, episodes, genres, studios, and release years.

## Stack

- Backend: Node.js + Express
- Scraping: Cheerio + Axios
- Deployment: Standalone Node.js server

---

## Local Development

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Setup environment variable (optional)
```bash
# backend/.env
CF_WORKER_URL=https://your-worker.workers.dev
```

### 3. Run backend
```bash
cd backend
npm start
```
Server runs at `http://localhost:3000`

---

## Project Structure

```
EcchiZone/
├── backend/
│   ├── server.js
│   ├── scraper.js
│   ├── services/
│   │   └── scraperService.js
│   ├── controllers/
│   │   └── scraperController.js
│   ├── routes/
│   │   └── scraperRoutes.js
│   └── package.json
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/list` | Hentai series list (default: A-Z) |
| GET | `/api/list?filter=recent` | Sort by recent |
| GET | `/api/list?filter=rating` | Sort by rating |
| GET | `/api/list?filter=alphabet` | Sort A-Z |
| GET | `/api/list?filter=weekly` | Sort by weekly views |
| GET | `/api/list?filter=monthly` | Sort by monthly views |
| GET | `/api/list?filter=alltime` | Sort by all-time views |
| GET | `/api/list?page=2` | Pagination |
| GET | `/api/genres` | All genres, studios, and release years |
| GET | `/api/genre/:slug` | Series by genre (default: alltime) |
| GET | `/api/genre/:slug?filter=rating` | Genre list sorted by rating |
| GET | `/api/genre/:slug?page=2` | Genre list with pagination |
| GET | `/api/studio/:slug` | Series by studio (default: alltime) |
| GET | `/api/studio/:slug?filter=recent` | Studio list sorted by recent |
| GET | `/api/studio/:slug?page=2` | Studio list with pagination |
| GET | `/api/release/:year` | Series by release year (default: alltime) |
| GET | `/api/release/:year?filter=monthly` | Release list sorted by monthly |
| GET | `/api/release/:year?page=2` | Release list with pagination |
| GET | `/api/episode?url=` | Episode data with player sources |
| GET | `/api/detail?url=` | Series detail with episode list |
| GET | `/api/home` | Homepage sections |
| GET | `/api/monthly` | New monthly hentai |
| GET | `/api/monthly?page=2` | New monthly hentai with pagination |
| GET | `/api/search?q=` | Search results |
| GET | `/api/toprated?tab=monthly` | Top rated (monthly/3d/uncensored) |
| GET | `/proxy` | Proxy endpoint for bypassing CSP |

---

## Response Examples

### `/api/list`
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "title": "3D – Assorted Collection",
        "link": "https://hentaimama.io/tvshows/3d-assorted-collection/",
        "thumbnail": "https://hentaimama.io/wp-content/uploads/...",
        "rating": "7.7",
        "studios": ["Studio1", "Studio2"],
        "genres": ["3D", "Big Tits"],
        "date": "Aug 28, 2026"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "lastPage": 56,
      "basePageUrl": "https://hentaimama.io/hentai-series/page/",
      "pages": [1, 2, 3, 4, 5]
    }
  }
}
```

### `/api/genres`
```json
{
  "success": true,
  "data": {
    "genres": [
      { "name": "3D", "url": "https://hentaimama.io/genre/3d/" },
      { "name": "Ahegao", "url": "https://hentaimama.io/genre/ahegao/" }
    ],
    "studios": [
      { "name": "Active", "url": "https://hentaimama.io/studio/active/" }
    ],
    "years": [
      { "name": "2026", "url": "https://hentaimama.io/release/2026/" }
    ]
  }
}
```

### `/api/episode`
```json
{
  "success": true,
  "data": {
    "title": "Kanojo Saimin - Episode 1",
    "genres": ["3D", "Big Tits"],
    "screenshots": ["https://hentaimama.io/wp-content/uploads/..."],
    "episodes": [
      {
        "epNum": "1",
        "link": "https://hentaimama.io/episodes/kanojo-saimin-episode-1/",
        "thumb": "https://hentaimama.io/wp-content/uploads/...",
        "date": "Aug 28, 2026"
      },
      {
        "epNum": "2",
        "link": "https://hentaimama.io/episodes/kanojo-saimin-episode-2/",
        "thumb": "https://hentaimama.io/wp-content/uploads/...",
        "date": "Aug 28, 2026"
      }
    ],
    "prevEp": "",
    "nextEp": "https://hentaimama.io/episodes/kanojo-saimin-episode-2/",
    "seriesLink": "https://hentaimama.io/tvshows/kanojo-saimin/",
    "thumbnail": "https://hentaimama.io/wp-content/uploads/...",
    "seriesCover": "https://hentaimama.io/wp-content/uploads/...",
    "playerSrcs": [
      {
        "option": 1,
        "src": "https://gdvid.info/K/kanojo-saimin-1.mp4",
        "proxySrc": "/api/video?url=https%3A%2F%2Fgdvid.info%2FK%2Fkanojo-saimin-1.mp4",
        "type": "mp4"
      },
      {
        "option": 2,
        "src": "https://hentaidoge.org/s/.../master.m3u8",
        "proxySrc": "/api/video?url=https%3A%2F%2Fhentaidoge.org%2Fs%2F...%2Fmaster.m3u8",
        "type": "hls"
      }
    ],
    "rating": "8.1",
    "studio": "Bunnywalker",
    "airedOn": "Aug 2026",
    "similarTitles": [
      {
        "title": "Similar Title",
        "link": "https://hentaimama.io/tvshows/similar-title/",
        "thumbnail": "https://hentaimama.io/wp-content/uploads/...",
        "rating": "7.5"
      }
    ],
    "postId": "16989"
  }
}
```

---

## Filter Options

Available filters for `/api/list`, `/api/genre/:slug`, `/api/studio/:slug`, and `/api/release/:year`:

- `recent` - Sort by recent
- `rating` - Sort by rating
- `alphabet` - Sort A-Z
- `weekly` - Sort by weekly views
- `monthly` - Sort by monthly views
- `alltime` - Sort by all-time views (default for detail pages)

---

## Caching

- Episode data: 30 minutes
- Genres/Studios/Years: 1 hour
- List data: 10 minutes
- Detail pages: 30 minutes

---

## Proxy Endpoint

The `/proxy` endpoint can be used to bypass CSP (Content Security Policy) restrictions when embedding content from hentaimama.io.