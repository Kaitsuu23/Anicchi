const API = '/api';
const content = document.getElementById('ep-content');

// Helper
function urlToSlug(url) { return url.replace(/\/$/, '').split('/').pop(); }
function detailHref(url) { return `/detail/${urlToSlug(url)}/`; }
function episodeHref(url) { return `/episodes/${urlToSlug(url)}/`; }

// Read slug from clean URL: /episodes/{slug}/
const epSlug = location.pathname.replace(/^\/episodes\//, '').replace(/\/$/, '');
const videoUrl = epSlug ? `https://hentaimama.io/episodes/${epSlug}/` : '';

async function loadEpisode() {
  if (!videoUrl) { content.innerHTML = `<div class="error-msg"><span>⚠️</span>URL tidak ditemukan.</div>`; return; }

  // Tampilkan loading indicator
  content.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh; flex-direction: column; gap: 1rem;">
      <div class="spinner" style="width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <div style="color: var(--muted); font-size: 0.9rem;">Memuat episode...</div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `;

  try {
    const res = await fetch(`${API}/episode?url=${encodeURIComponent(videoUrl)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    const d = json.data;

    document.title = `${d.title} – EcchiZone`;
    const navSub = document.querySelector('.nav-subtitle');
    if (navSub) navSub.textContent = d.title;

    const genres = d.genres.map(g =>
      `<a class="ep-genre" href="/genre/${g.slug}/">${g.name}</a>`
    ).join('');

    const epList = d.episodes.map(ep => {
      const isCurrent = ep.link.replace(/\/$/, '') === videoUrl.replace(/\/$/, '');
      return `
        <a class="ep-item ${isCurrent ? 'active' : ''}" href="${episodeHref(ep.link)}">
          <img src="${ep.thumb || ''}" alt="${ep.epTitle}" loading="lazy"
            onerror="this.src='https://placehold.co/90x52/0a0a0f/444?text=EP'" />
          <div class="ep-item-info">
            <div class="ep-item-title">${ep.epTitle}</div>
            <div class="ep-item-date">${ep.date}</div>
          </div>
        </a>`;
    }).join('');

    const prevBtn = d.prevEp ? `<a class="ep-nav-btn" href="${episodeHref(d.prevEp)}">‹ Previous</a>` : '';
    const nextBtn = d.nextEp ? `<a class="ep-nav-btn" href="${episodeHref(d.nextEp)}">Next ›</a>` : '';
    const listBtn = d.seriesLink ? `<a class="ep-nav-btn" href="${detailHref(d.seriesLink)}">☰ Episodes</a>` : '';

    // Player — pakai src langsung dari AJAX
    let playerHtml = '';
    if (d.playerSrcs && d.playerSrcs.length) {
      const firstPlayer = d.playerSrcs[0];
      // Web browser needs proxySrc (adds CORS headers), native apps use src directly
      const getWebSrc = (p) => p.proxySrc || p.src;
      const optionBtns = d.playerSrcs.map((p, i) =>
        `<button class="ep-opt-btn ${i === 0 ? 'active' : ''}" data-src="${getWebSrc(p)}" data-type="${p.type || 'mp4'}" onclick="switchPlayer('${getWebSrc(p)}', '${p.type || 'mp4'}', this)">Option ${p.option}</button>`
      ).join('');

      const webSrc = getWebSrc(firstPlayer);
      const directSrc = firstPlayer.src;
      const initialPlayerContent = firstPlayer.type === 'iframe'
        ? `<iframe id="ep-iframe" src="${webSrc}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe>`
        : `<video id="ep-video" preload="metadata" style="width:100%;height:100%"
            onerror="if(this.src!=='${directSrc}'){this.src='${directSrc}';this.load();}">
            <source src="${webSrc}" type="video/mp4">
          </video>
          <div class="player-overlay" id="player-overlay">
            <button class="play-big-btn" id="play-big-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
          <div class="player-controls" id="player-controls">
            <div class="progress-bar-wrap" id="progress-wrap" onclick="seekVideo(event)">
              <div class="progress-bar-bg"></div>
              <div class="progress-bar-fill" id="progress-fill"></div>
              <div class="progress-thumb" id="progress-thumb"></div>
            </div>
            <div class="controls-row">
              <div class="controls-left">
                <button class="ctrl-btn" onclick="togglePlay()" id="play-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button class="ctrl-btn" onclick="skip(-10)" title="-10s">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="12" y="15" text-anchor="middle" font-size="6" fill="currentColor">10</text></svg>
                </button>
                <button class="ctrl-btn" onclick="skip(10)" title="+10s">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="12" y="15" text-anchor="middle" font-size="6" fill="currentColor">10</text></svg>
                </button>
                <div class="volume-wrap">
                  <button class="ctrl-btn" onclick="toggleMute()" id="mute-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  </button>
                  <div class="volume-slider-wrap">
                    <input type="range" class="volume-slider" id="volume-slider" min="0" max="1" step="0.05" value="1" style="writing-mode:vertical-lr;direction:rtl" oninput="setVolume(this.value)">
                  </div>
                </div>
                <span class="time-display" id="time-display">0:00 / 0:00</span>
              </div>
              <div class="controls-right">
                <button class="ctrl-btn" onclick="toggleFullscreen()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                </button>
              </div>
            </div>
          </div>`;

      playerHtml = `
        <div class="ep-player-wrap" id="player-container" style="position:relative">
          ${initialPlayerContent}
        </div>
        <div class="ep-options">${optionBtns}</div>`;
    } else {
      playerHtml = `<div class="ep-player-wrap" id="player-container" style="display:flex;align-items:center;justify-content:center;background:#111">
        <p style="color:var(--muted)" id="player-loading-msg">Memuat player...</p></div>`;
    }

    content.innerHTML = `
      <div class="ep-layout">
        <div class="ep-left">
          ${playerHtml}
          <div class="ep-nav-bar">${prevBtn}${listBtn}${nextBtn}</div>
          ${d.screenshots.length ? `
          <div class="ep-screenshots">
            <div class="ep-section-title">Screenshots</div>
            <div class="ep-shots-grid">
              ${d.screenshots.map(s => `<img src="${s}" loading="lazy" class="ep-shot" />`).join('')}
            </div>
          </div>` : ''}
          <div class="ep-meta-card">
            <div class="ep-meta-top">
              <div class="ep-meta-cover">
                <img src="${d.seriesCover || d.thumbnail || ''}" alt="${d.title}" onerror="this.src='https://placehold.co/160x225/0a0a0f/444?text=N/A'" />
              </div>
              <div class="ep-meta-body">
                <h2 class="ep-meta-title">${d.title}</h2>
                ${(d.rating || d.votes) ? `
                <div class="ep-meta-rating">
                  <span class="ep-meta-score">${d.rating || '—'}</span>
                  <div class="ep-meta-stars">${renderStars(parseFloat(d.rating) || 0)}</div>
                  ${d.votes ? `<span class="ep-meta-votes">👥 ${d.votes} votes</span>` : ''}
                </div>` : ''}
                ${d.genres.length ? `
                <div class="ep-meta-genres">
                  ${d.genres.map(g => `<a class="ep-meta-tag" href="/genre/${g.slug}/">${g.name}</a>`).join('')}
                </div>` : ''}
                ${d.studio ? `
                <div class="ep-meta-info-row">
                  <span class="ep-meta-label">Studio</span>
                  <span class="ep-meta-value ep-meta-studio">${d.studio}</span>
                </div>` : ''}
                ${d.airedOn ? `
                <div class="ep-meta-info-row">
                  <span class="ep-meta-label">Aired On:</span>
                  <span class="ep-meta-value">${d.airedOn}</span>
                </div>` : ''}
              </div>
            </div>
          </div>
          <div class="ep-episodes-below">
            <div class="ep-section-title">Episodes</div>
            <div class="ep-list">${epList}</div>
          </div>
        </div>
        <div class="ep-right">
          <div class="ep-sidebar-widget">
            <div class="ep-sidebar-tabs">
              <button class="ep-sidebar-tab active" onclick="switchSidebarTab('genres', this)">Genres</button>
              <button class="ep-sidebar-tab" onclick="switchSidebarTab('year', this)">Year</button>
              <button class="ep-sidebar-tab" onclick="switchSidebarTab('producers', this)">Producers</button>
            </div>
            <div class="ep-sidebar-content" id="sidebar-genres">
              <div class="ep-sidebar-loading">Loading...</div>
            </div>
            <div class="ep-sidebar-content hidden" id="sidebar-year"></div>
            <div class="ep-sidebar-content hidden" id="sidebar-producers"></div>
          </div>
        </div>
      </div>`;

    // Init custom player setelah DOM render
    setTimeout(initPlayer, 50);
    loadSidebar();

    // ── Watch History ─────────────────────────────────────────
    const seriesSlug = d.seriesLink ? urlToSlug(d.seriesLink) : null;
    saveWatchHistory({
      video_slug: epSlug,
      video_title: d.title,
      video_cover_url: d.seriesCover || d.thumbnail || null,
      series_slug: seriesSlug,
      series_title: d.seriesTitle || d.title,
      watch_progress: 0,
    });

    // Resume dari progress terakhir
    resumeProgress(epSlug);

    // Update progress setiap 15 detik saat nonton
    const _progressInterval = setInterval(() => {
      const v = document.getElementById('ep-video');
      if (!v || !v.duration) return;
      const progress = Math.floor(v.currentTime);
      const duration = Math.floor(v.duration);
      const pct = Math.round((progress / duration) * 100);
      const filled = Math.round(pct / 5);
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
      console.log(`%c[history] ${String(Math.floor(progress/60)).padStart(2,'0')}:${String(progress%60).padStart(2,'0')} ${bar} ${pct}% (${progress}s)`, 'color:#a855f7;font-family:monospace');
      saveWatchHistory({
        video_slug: epSlug,
        video_title: d.title,
        video_cover_url: d.seriesCover || d.thumbnail || null,
        series_slug: seriesSlug,
        series_title: d.seriesTitle || d.title,
        watch_progress: progress,
        video_duration: duration,
      });
    }, 10000);

    // Panggil AJAX dari browser hanya jika server-side scraper tidak dapat playerSrcs
    if (!d.playerSrcs || d.playerSrcs.length === 0) {
      if (d.postId) {
        loadPlayerViaAjax(d.postId, d.url || videoUrl);
      } else {
        showPlayerError();
      }
    }
  } catch (err) {
    content.innerHTML = `<div class="error-msg"><span>⚠️</span>${err.message}</div>`;
  }
}

function renderStars(score) {
  const filled = Math.round(score);
  return Array.from({ length: 10 }, (_, i) =>
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="${i < filled ? '#a855f7' : 'rgba(255,255,255,0.15)'}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
  ).join('');
}


function switchPlayer(src, type, btn) {
  const container = document.getElementById('player-container');
  if (!container) return;

  if (type === 'iframe') {
    // Replace content with iframe
    container.innerHTML = `<iframe id="ep-iframe" src="${src}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe>`;
  } else {
    // Replace content with video player
    const video = document.getElementById('ep-video');
    if (video) {
      video.src = src; video.load(); video.play();
    } else {
      container.innerHTML = `
        <video id="ep-video" preload="metadata" autoplay style="width:100%;height:100%">
          <source src="${src}" type="video/mp4">
        </video>`;
      setTimeout(initPlayer, 50);
    }
  }
  document.querySelectorAll('.ep-opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

loadEpisode();

async function loadSidebar() {
  try {
    const [genreRes, syRes] = await Promise.all([
      fetch(`${API}/genres`),
      fetch(`${API}/studios-years`)
    ]);
    const genreJson = await genreRes.json();
    const syJson = await syRes.json();

    // GENRES
    if (genreJson.success) {
      document.getElementById('sidebar-genres').innerHTML = genreJson.data.map(g => {
        const slug = g.url.split('/genre/')[1] || '';
        return `<a class="ep-sidebar-item" href="/genre/${slug}">
          <span class="ep-sidebar-arrow">▶</span>
          <span class="ep-sidebar-name">${g.name}</span>
        </a>`;
      }).join('');
    }

    // YEAR — grid 3 kolom, descending
    if (syJson.success) {
      const years = [...syJson.data.years].sort((a, b) => b - a);
      document.getElementById('sidebar-year').innerHTML =
        `<div class="ep-sidebar-year-grid">` +
        years.map(y =>
          `<a class="ep-sidebar-year-item" href="/release/${y}/">${y}</a>`
        ).join('') +
        `</div>`;

      document.getElementById('sidebar-producers').innerHTML = syJson.data.studios.map(s => {
        const slug = s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return `<a class="ep-sidebar-item" href="/studio/${slug}/">
          <span class="ep-sidebar-arrow">▶</span>
          <span class="ep-sidebar-name">${s}</span>
        </a>`;
      }).join('');
    }
  } catch(e) {
    document.getElementById('sidebar-genres').innerHTML = '<div style="color:var(--muted);padding:1rem">Failed to load</div>';
  }
}

function switchSidebarTab(tab, btn) {
  document.querySelectorAll('.ep-sidebar-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ep-sidebar-content').forEach(c => c.classList.add('hidden'));
  btn.classList.add('active');
  document.getElementById(`sidebar-${tab}`)?.classList.remove('hidden');
}

function initPlayer() {
  const video = document.getElementById('ep-video');
  if (!video) return; // iframe mode, no custom controls needed

  const playBtn = document.getElementById('play-btn');
  const playBigBtn = document.getElementById('play-big-btn');
  const progressFill = document.getElementById('progress-fill');
  const progressThumb = document.getElementById('progress-thumb');
  const timeDisplay = document.getElementById('time-display');
  const overlay = document.getElementById('player-overlay');
  const container = document.getElementById('player-container');

  function fmt(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }

  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    progressFill.style.width = pct + '%';
    progressThumb.style.left = pct + '%';
    timeDisplay.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
  });

  const PLAY_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const PAUSE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  const VOL_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  const MUTE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

  video.addEventListener('play', () => {
    playBtn.innerHTML = PAUSE_ICON;
    playBigBtn.innerHTML = PAUSE_ICON;
    overlay.classList.add('hidden');
  });
  video.addEventListener('pause', () => {
    playBtn.innerHTML = PLAY_ICON;
    playBigBtn.innerHTML = PLAY_ICON;
    overlay.classList.remove('hidden');
  });
  video.addEventListener('ended', () => {
    playBtn.innerHTML = PLAY_ICON;
    overlay.classList.remove('hidden');
  });

  // Klik video area untuk play/pause
  video.addEventListener('click', togglePlay);
  overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // Auto-hide controls
  let hideTimer;
  container.addEventListener('mousemove', () => {
    container.classList.add('show-controls');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!video.paused) container.classList.remove('show-controls');
    }, 2500);
  });
  container.classList.add('show-controls');

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Jangan trigger kalau user lagi ketik di input
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    const v = document.getElementById('ep-video');
    if (!v) return;

    switch(e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
      case 'l':
        e.preventDefault();
        skip(10);
        showToast('+10s');
        break;
      case 'ArrowLeft':
      case 'j':
        e.preventDefault();
        skip(-10);
        showToast('-10s');
        break;
      case 'ArrowUp':
        e.preventDefault();
        v.volume = Math.min(1, v.volume + 0.1);
        document.getElementById('volume-slider').value = v.volume;
        setVolume(v.volume);
        showToast(`Vol ${Math.round(v.volume * 100)}%`);
        break;
      case 'ArrowDown':
        e.preventDefault();
        v.volume = Math.max(0, v.volume - 0.1);
        document.getElementById('volume-slider').value = v.volume;
        setVolume(v.volume);
        showToast(`Vol ${Math.round(v.volume * 100)}%`);
        break;
      case 'm':
        toggleMute();
        showToast(v.muted ? 'Muted' : 'Unmuted');
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  });
}

function togglePlay() {
  const v = document.getElementById('ep-video');
  if (!v) return;
  v.paused ? v.play() : v.pause();
}

function skip(sec) {
  const v = document.getElementById('ep-video');
  if (v) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec));
}

function setVolume(val) {
  const v = document.getElementById('ep-video');
  if (!v) return;
  v.volume = val;
  v.muted = val == 0;
  const muteBtn = document.getElementById('mute-btn');
  if (val == 0) {
    muteBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
  } else if (val < 0.5) {
    muteBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
  } else {
    muteBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  }
}

function toggleMute() {
  const v = document.getElementById('ep-video');
  if (!v) return;
  v.muted = !v.muted;
  const muteBtn = document.getElementById('mute-btn');
  muteBtn.innerHTML = v.muted
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  document.getElementById('volume-slider').value = v.muted ? 0 : v.volume;
}

function seekVideo(e) {
  const v = document.getElementById('ep-video');
  const wrap = document.getElementById('progress-wrap');
  if (!v || !v.duration) return;
  const rect = wrap.getBoundingClientRect();
  v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
}

function toggleFullscreen() {
  const c = document.getElementById('player-container');
  if (!document.fullscreenElement) c.requestFullscreen();
  else document.exitFullscreen();
}

function showToast(msg) {
  let toast = document.getElementById('player-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'player-toast';
    document.getElementById('player-container')?.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 1200);
}

async function loadPlayerViaAjax(postId, epUrl) {
  const WORKER = 'https://henmama.andhikarafi321.workers.dev/';

  console.log('[player] Starting AJAX for postId:', postId);

  try {
    // Pakai mode=ajax di worker supaya cookies episode ikut dikirim ke AJAX
    const ajaxUrl = `${WORKER}?mode=ajax&postId=${encodeURIComponent(postId)}&epUrl=${encodeURIComponent(epUrl)}`;
    const res = await fetch(ajaxUrl);

    const text = await res.text();
    console.log('[player] AJAX response:', text.slice(0, 100));

    let players;
    try { players = JSON.parse(text); } catch { return showPlayerError(); }
    if (!Array.isArray(players) || players.length === 0) return showPlayerError();

    const srcs = [];
    for (let i = 0; i < Math.min(players.length, 2); i++) {
      const tmp = document.createElement('div');
      tmp.innerHTML = players[i];
      const iframe = tmp.querySelector('iframe');
      const iframeSrc = iframe?.getAttribute('src')?.replace(/\\\//g, '/') || '';
      console.log(`[player] option ${i+1} iframe src:`, iframeSrc);
      if (!iframeSrc) continue;

      try {
        const playerPageRes = await fetch(`${WORKER}?url=${encodeURIComponent(iframeSrc)}`);
        const playerHtml = await playerPageRes.text();
        const mp4Match = playerHtml.match(/file\s*:\s*["']([^"']+)["']/i) ||
                         playerHtml.match(/["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)["']/i);
        console.log(`[player] option ${i+1} mp4:`, mp4Match?.[1]);
        if (mp4Match) srcs.push({ option: i + 1, src: mp4Match[1], type: 'mp4' });
      } catch(e) {
        console.log(`[player] option ${i+1} error:`, e.message);
      }
    }

    if (srcs.length === 0) return showPlayerError();
    renderPlayer(srcs);
  } catch(e) {
    console.log('[player] Fatal:', e.message);
    showPlayerError();
  }
}

function showPlayerError() {
  const container = document.getElementById('player-container');
  if (container) container.innerHTML = `<p style="color:var(--muted);margin:auto">Player tidak tersedia</p>`;
}

function renderPlayer(srcs) {
  const container = document.getElementById('player-container');
  if (!container) return;

  const first = srcs[0];
  container.style.display = '';
  container.innerHTML = `
    <video id="ep-video" preload="metadata" autoplay style="width:100%;height:100%">
      <source src="${first.src}" type="video/mp4">
    </video>`;

  // Update option buttons jika ada
  let optionsDiv = document.querySelector('.ep-options');
  if (!optionsDiv) {
    optionsDiv = document.createElement('div');
    optionsDiv.className = 'ep-options';
    container.insertAdjacentElement('afterend', optionsDiv);
  }
  optionsDiv.innerHTML = srcs.map((p, i) =>
    `<button class="ep-opt-btn ${i === 0 ? 'active' : ''}"
      onclick="switchPlayer('${p.src}','mp4',this)">Option ${p.option}</button>`
  ).join('');

  setTimeout(initPlayer, 50);
}

// ── Watch History helper ──────────────────────────────────────
async function saveWatchHistory(data) {
  const token = localStorage.getItem('ez_token');
  if (!token) return;
  try {
    await fetch('/api/auth?action=history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  } catch { /* silent fail */ }
}

async function resumeProgress(slug) {
  const token = localStorage.getItem('ez_token');
  if (!token) return;
  try {
    const res = await fetch(`/api/auth?action=history&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    if (!json.success) return;
    const item = json.data.find(h => h.video_slug === slug);
    if (!item || !item.watch_progress || item.watch_progress < 10) return;

    const progress = item.watch_progress;

    // Poll sampai video element ada dan siap, max 15 detik
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      if (attempts > 30) { clearInterval(poll); console.log('[resume] timeout - video element not found'); return; }

      const v = document.getElementById('ep-video');
      console.log(`[resume] attempt ${attempts}, video:`, v ? `readyState=${v.readyState} duration=${v.duration}` : 'not found');
      if (!v) return;

      if (v.readyState >= 1 && v.duration) {
        clearInterval(poll);
        console.log(`[resume] seeking to ${progress}s, duration=${v.duration}`);
        if (progress / v.duration > 0.95) return;
        v.currentTime = progress;
        showResumeToast(progress);
      } else {
        v.addEventListener('loadedmetadata', () => {
          clearInterval(poll);
          console.log(`[resume] loadedmetadata, seeking to ${progress}s`);
          if (!v.duration || progress / v.duration > 0.95) return;
          v.currentTime = progress;
          showResumeToast(progress);
        }, { once: true });
      }
    }, 500);
  } catch { /* silent */ }
}

function showResumeToast(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  showToast(`▶ Lanjut dari ${m}:${String(s).padStart(2,'0')}`);
}
