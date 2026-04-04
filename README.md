# EcchiZone

Hentai streaming site built with a Node.js scraper backend and vanilla JS frontend. Deployable on Vercel as serverless functions.

## Stack

- Frontend: Vanilla HTML/CSS/JS
- Backend: Node.js serverless functions (Vercel) / Express (local)
- Scraping: Cheerio + Axios via Cloudflare Worker proxy
- Deployment: Vercel

---

## Local Development

### 1. Install backend dependencies
```bash
cd backend
npm install
```

### 2. Setup environment variable
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

### 4. Open frontend
Open `frontend/index.html` in browser or use VS Code Live Server.

---

## Deploy to Vercel

1. Push repo to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Add environment variable: `CF_WORKER_URL` = your Cloudflare Worker URL
4. Deploy

Vercel auto-detects `api/` as serverless functions and uses `vercel.json` for routing.

---

## Project Structure

```
EcchiZone/
├── api/                        # Vercel serverless functions
│   ├── home.js
│   ├── list.js
│   ├── search.js
│   ├── episode.js
│   ├── detail.js
│   ├── genres.js
│   ├── studios-years.js
│   ├── release.js
│   └── studio.js
├── lib/                        # Shared scraper & cache
│   ├── scraper.js
│   └── cache.js
├── frontend/                   # Static frontend
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── episodes.js
│   │   ├── detail.js
│   │   ├── search.js
│   │   ├── genres.js
│   │   ├── series.js
│   │   ├── pagelist.js
│   │   ├── navbar.js
│   │   └── footer.js
│   └── pages/
│       ├── episodes.html
│       ├── detail.html
│       ├── genre.html
│       ├── genres.html
│       ├── series.html
│       ├── search.html
│       ├── release.html
│       ├── studio.html
│       └── ...
├── backend/                    # Local Express server (dev only)
│   ├── server.js
│   ├── scraper.js
│   └── ...
├── cloudflare-worker/
│   └── worker.js               # Proxy to bypass CORS/CSP
├── vercel.json                 # Routing config
└── package.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/home` | Homepage sections |
| GET | `/api/list?url=` | Paginated list from any URL |
| GET | `/api/search?q=` | Search results |
| GET | `/api/episode?url=` | Episode data + player |
| GET | `/api/detail?url=` | Series detail + episode list |
| GET | `/api/genres` | All genres |
| GET | `/api/studios-years` | All studios & years |
| GET | `/api/release/:year?page=` | Series by release year |
| GET | `/api/studio/:slug?page=` | Series by studio |

---

## Clean URL Routes

| URL | Page |
|-----|------|
| `/` | Home |
| `/detail/:slug/` | Series detail |
| `/episodes/:slug/` | Episode player |
| `/genre/:slug/` | Genre list |
| `/release/:year/` | Year archive |
| `/studio/:slug/` | Studio page |
| `/search/:query` | Search results |
| `/series/` | All series |
| `/genres/` | All genres |
| `/recent-episodes/` | Recent episodes |
| `/hentai-list/` | A-Z list |
