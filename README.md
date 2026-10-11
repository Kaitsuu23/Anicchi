# Anicchi

Full-stack hentai streaming app — scraper API, web frontend, and Android mobile app for hentaimama.io.

## Stack

| Layer | Tech |
|-------|------|
| Backend (API) | Node.js + Express + Cheerio + Axios |
| Frontend (Web) | Next.js 16 + React 19 + Tailwind CSS + shadcn/ui |
| Mobile (Android) | Flutter + Dart |
| Proxy | Cloudflare Workers |

---

## Project Structure

```
Anicchi/
├── backend/                    # Scraper API (Node.js)
│   ├── server.js
│   ├── scraper.js
│   ├── services/
│   │   └── scraperService.js
│   ├── controllers/
│   │   └── scraperController.js
│   ├── routes/
│   │   └── scraperRoutes.js
│   ├── .env
│   └── package.json
│
├── cloudflare-worker/          # CF Worker proxy
│   └── worker.js
│
├── frontend/                   # Web app (Next.js)
│   ├── src/
│   │   ├── app/                # App router pages
│   │   ├── components/         # UI components
│   │   └── lib/                # Utilities & API client
│   ├── next.config.ts
│   └── package.json
│
├── ecchizone_app/              # Mobile app (Flutter/Android)
│   ├── lib/
│   │   ├── core/               # Services, theme, constants
│   │   ├── screens/            # App screens
│   │   └── widgets/            # Reusable widgets
│   ├── android/
│   └── pubspec.yaml
│
└── README.md
```

---

## Setup & Running

### 1. Cloudflare Worker (required first)

Deploy the worker proxy to bypass CORS & hotlink protection:

```bash
cd cloudflare-worker
# Upload worker.js via Cloudflare Dashboard or wrangler
wrangler deploy
```

Copy the worker URL (e.g. `https://your-worker.workers.dev`).

---

### 2. Backend API

```bash
cd backend
npm install
```

Create `.env`:
```env
CF_WORKER_URL=https://your-worker.workers.dev
PORT=3000
```

Run:
```bash
npm start
```

API runs at `http://localhost:3000`

---

### 3. Frontend (Web)

```bash
cd frontend
npm install
npm run dev
```

Web app runs at `http://localhost:3000`

> Set your API base URL in `src/lib/` to point to the backend.

---

### 4. Mobile App (Flutter)

Requirements: Flutter SDK ≥ 3.5.0, Android SDK

```bash
cd ecchizone_app
flutter pub get
flutter run           # development
flutter build apk --release   # production APK
```

APK output: `build/app/outputs/flutter-apk/app-release.apk`

---

## Mobile App Features

- Browse home, series, genres, studios, monthly releases
- Episode streaming with HLS & MP4 support
- Custom video player (brightness, volume, seek gestures)
- Fullscreen landscape mode
- Continue Watching (local history)
- Favorites with selection mode
- Watch History screen
- Backup & Restore (export/import JSON)
- Search
- Navigation bar hidden, status bar visible

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/home` | Homepage sections |
| GET | `/api/list` | Series list (default: A-Z) |
| GET | `/api/list?filter=recent` | Sort by recent |
| GET | `/api/list?filter=rating` | Sort by rating |
| GET | `/api/list?filter=alphabet` | Sort A-Z |
| GET | `/api/list?filter=weekly` | Sort by weekly |
| GET | `/api/list?filter=monthly` | Sort by monthly |
| GET | `/api/list?filter=alltime` | Sort by all-time |
| GET | `/api/list?page=2` | Pagination |
| GET | `/api/genres` | All genres, studios, years |
| GET | `/api/genre/:slug` | Series by genre |
| GET | `/api/genre/:slug?filter=rating&page=2` | Genre with filter + pagination |
| GET | `/api/studio/:slug` | Series by studio |
| GET | `/api/studio/:slug?filter=recent&page=2` | Studio with filter + pagination |
| GET | `/api/release/:year` | Series by release year |
| GET | `/api/release/:year?filter=monthly&page=2` | Release with filter + pagination |
| GET | `/api/episode?url=` | Episode data + player sources |
| GET | `/api/detail?url=` | Series detail + episode list |
| GET | `/api/monthly?page=1` | New monthly hentai |
| GET | `/api/search?q=` | Search |
| GET | `/api/toprated?tab=monthly` | Top rated (monthly/3d/uncensored) |
| GET | `/api/hentai-list` | Full A-Z title list |
| GET | `/api/recent-episodes?page=1` | Recent episodes |
| GET | `/api/image?url=` | Image proxy (bypass hotlink) |
| GET | `/api/video?url=` | Video proxy (HLS/MP4) |

---

## Filter Options

Available for `/api/list`, `/api/genre/:slug`, `/api/studio/:slug`, `/api/release/:year`:

| Value | Description |
|-------|-------------|
| `recent` | Sort by recently added |
| `rating` | Sort by rating |
| `alphabet` | Sort A-Z (default for list) |
| `weekly` | Sort by weekly views |
| `monthly` | Sort by monthly views |
| `alltime` | Sort by all-time views |

---

## Caching

| Data | TTL |
|------|-----|
| Home | 10 minutes |
| Episode | 30 minutes |
| Detail | 30 minutes |
| Genres/Studios/Years | 1 hour |
| List/Genre/Studio | 10 minutes |

---

## Flutter Dependencies

| Package | Purpose |
|---------|---------|
| `go_router` | Navigation |
| `provider` | State management |
| `video_player` + `chewie` | Video playback |
| `cached_network_image` | Image caching |
| `shared_preferences` | Local storage (history, favorites) |
| `file_picker` | Import backup JSON |
| `path_provider` | File system access |
| `screen_brightness` | Player brightness gesture |
| `volume_controller` | Player volume gesture |
| `wakelock_plus` | Keep screen on while playing |
| `shimmer` | Loading skeleton |
| `visibility_detector` | Detect screen visibility |
