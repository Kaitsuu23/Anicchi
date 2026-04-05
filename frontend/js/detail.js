// Helper: extract slug from hentaimama URL
function urlToSlug(url) {
  return url.replace(/\/$/, '').split('/').pop();
}
function detailHref(url) {
  return `/detail/${urlToSlug(url)}/`;
}
function episodeHref(url) {
  return `/episodes/${urlToSlug(url)}/`;
}

const API = '/api';
const container = document.getElementById('detail-content');

// Read slug from clean URL path: /detail/{slug}/
const slug = location.pathname.replace(/^\/detail\//, '').replace(/\/$/, '');
const videoUrl = slug ? `https://hentaimama.io/tvshows/${slug}/` : '';

async function loadDetail() {
  if (!videoUrl) {
    container.innerHTML = `<div class="error-msg"><span>⚠️</span>URL tidak ditemukan.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;min-height:50vh;flex-direction:column;gap:1rem;">
      <div style="width:40px;height:40px;border:4px solid rgba(255,255,255,0.1);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite;"></div>
      <div style="color:var(--muted);font-size:0.9rem;">Memuat detail...</div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;

  try {
    const res = await fetch(`${API}/detail?url=${encodeURIComponent(videoUrl)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    const d = json.data;

    document.title = `${d.title} – EcchiZone`;
    const navSub = document.querySelector('.nav-subtitle');
    if (navSub) navSub.textContent = d.title;
    // Init favorite setelah data tersedia
    setTimeout(() => initFavorite(d.title, d.thumbnail), 100);

    const genres = (d.genres || []).map(g =>
      `<a class="ep-meta-tag" href="/genre/${g.slug}/">${g.name}</a>`
    ).join('');

    const epList = (d.episodes || []).map(ep => `
      <a class="dt-ep-card" href="${episodeHref(ep.link)}">
        <div class="dt-ep-thumb">
          <img src="${ep.thumb || ''}" alt="${ep.epTitle}" loading="lazy"
            onerror="this.src='https://placehold.co/320x180/0a0a0f/444?text=EP'" />
          ${ep.badge ? `<span class="badge badge-${ep.badge.toLowerCase()}">${ep.badge}</span>` : ''}
          ${ep.rating ? `<span class="card-rating"><span class="star">★</span>${ep.rating}</span>` : ''}
          ${ep.seriesTitle ? `<div class="dt-ep-series">${ep.seriesTitle}</div>` : ''}
        </div>
        <div class="dt-ep-info">
          <div class="dt-ep-title">${ep.epTitle}</div>
          ${ep.date ? `<div class="dt-ep-date">${ep.date}</div>` : ''}
        </div>
      </a>`).join('');

    container.innerHTML = `
      <div class="dt-layout">
        <!-- LEFT: poster + info -->
        <div class="dt-left">
          <div class="dt-poster">
            <img src="${d.thumbnail}" alt="${d.title}"
              onerror="this.src='https://placehold.co/280x400/0a0a0f/444?text=N/A'" />
          </div>
          <div class="dt-meta-box">
            ${d.rating ? `
            <div class="dt-rating-row">
              <span class="dt-score">${d.rating}</span>
              <div class="dt-stars">${renderStars(parseFloat(d.rating)||0)}</div>
              ${d.votes ? `<span class="dt-votes">👥 ${d.votes} votes</span>` : ''}
            </div>` : ''}
            ${d.studio ? `<div class="dt-field"><span class="dt-label">Studio</span><span class="dt-val dt-accent">${d.studio}</span></div>` : ''}
            ${d.firstAir ? `<div class="dt-field"><span class="dt-label">First Air</span><span class="dt-val">${d.firstAir}</span></div>` : ''}
            ${d.lastAir ? `<div class="dt-field"><span class="dt-label">Last Air</span><span class="dt-val">${d.lastAir}</span></div>` : ''}
            ${d.status ? `<div class="dt-field"><span class="dt-label">Status</span><span class="dt-val">${d.status}</span></div>` : ''}
            ${d.episodeCount ? `<div class="dt-field"><span class="dt-label">Episodes</span><span class="dt-val">${d.episodeCount}</span></div>` : ''}
          </div>
        </div>

        <!-- RIGHT: title, genres, desc, episodes -->
        <div class="dt-right">
          <h1 class="dt-title">${d.title}</h1>
          ${d.originalTitle ? `<div class="dt-original">${d.originalTitle}</div>` : ''}
          ${genres ? `<div class="dt-genres">${genres}</div>` : ''}
          <button id="fav-btn" onclick="toggleFavorite()" style="display:inline-flex;align-items:center;gap:0.5rem;margin:0.75rem 0;padding:0.55rem 1.25rem;width:fit-content;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);border-radius:10px;color:var(--muted);font-size:0.88rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.3s">
            <svg id="fav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span id="fav-text">Add to Favorites</span>
          </button>
          ${d.description ? `<p class="dt-desc">${d.description}</p>` : ''}

          ${epList ? `
          <div class="dt-episodes">
            <div class="ep-section-title" style="margin-bottom:.75rem">Episodes</div>
            <div class="dt-ep-grid">${epList}</div>
          </div>` : ''}
        </div>
      </div>`;

  } catch (err) {
    container.innerHTML = `<div class="error-msg"><span>⚠️</span>${err.message}</div>`;
  }
}

function renderStars(score) {
  const filled = Math.round(score);
  return Array.from({ length: 10 }, (_, i) =>
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="${i < filled ? '#a855f7' : 'rgba(255,255,255,0.15)'}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
  ).join('');
}

loadDetail();

// ── Favorites ─────────────────────────────────────────────────
let _favSlug = slug;
let _favTitle = '';
let _favCover = '';
let _isFav = false;

async function initFavorite(title, cover) {
  _favTitle = title;
  _favCover = cover;
  const token = localStorage.getItem('ez_token');
  if (!token) return;
  const res = await fetch(`/api/auth?action=favorites-check&slug=${encodeURIComponent(_favSlug)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (json.success) { _isFav = json.favorited; updateFavBtn(); }
}

function updateFavBtn() {
  const btn = document.getElementById('fav-btn');
  const icon = document.getElementById('fav-icon');
  const text = document.getElementById('fav-text');
  if (!btn) return;
  if (_isFav) {
    btn.style.borderColor = 'rgba(239,68,68,0.4)';
    btn.style.color = '#f87171';
    icon.setAttribute('fill', '#f87171');
    icon.setAttribute('stroke', 'none');
    text.textContent = 'Remove Favorite';
  } else {
    btn.style.borderColor = 'var(--glass-border)';
    btn.style.color = 'var(--muted)';
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    text.textContent = 'Add to Favorites';
  }
}

async function toggleFavorite() {
  const token = localStorage.getItem('ez_token');
  if (!token) { location.href = '/login?redirect=' + location.pathname; return; }
  const res = await fetch('/api/auth?action=favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ video_slug: _favSlug, video_title: _favTitle, video_cover_url: _favCover, video_type: 'series' }),
  });
  const json = await res.json();
  if (json.success) { _isFav = json.favorited; updateFavBtn(); }
}
