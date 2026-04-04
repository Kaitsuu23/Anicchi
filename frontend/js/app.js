const API = '/api';
const main = document.getElementById('main-content');

function skeletonGrid() {
  return `<div class="grid">${Array.from({ length: 6 }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-thumb"></div>
      <div class="skeleton skeleton-line" style="margin:0.6rem 0 0.3rem;"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>`).join('')}</div>`;
}

function renderCard(v, isEpisode = false) {
  const badge = v.badge
    ? `<span class="badge badge-${v.badge.toLowerCase().trim()}">${v.badge.trim()}</span>` : '';
  const rating = v.rating
    ? `<span class="card-rating"><span class="star">★</span>${v.rating}</span>` : '';
  const seriesOverlay = v.title
    ? `<div class="card-series-overlay">${v.title}</div>` : '';
  const slug = v.link.replace(/\/$/, '').split('/').pop();

  if (isEpisode) {
    return `
      <a class="card card-episode" href="/episodes/${slug}/" title="${v.title}">
        <div class="card-poster card-poster-landscape">
          <img class="card-thumb"
            src="${v.thumbnail || ''}"
            alt="${v.title}" loading="lazy"
            onerror="this.src='https://placehold.co/320x180/0a0a0f/444?text=No+Image'" />
          ${badge}
          ${seriesOverlay}
        </div>
        <div class="card-body">
          <div class="card-title">${v.episodeTitle || ''}</div>
          ${v.date ? `<div class="card-date">${v.date}</div>` : ''}
        </div>
      </a>`;
  }

  return `
    <a class="card" href="/episodes/${slug}/" title="${v.title}">
      <div class="card-poster">
        <img class="card-thumb"
          src="${v.thumbnail || ''}"
          alt="${v.title}" loading="lazy"
          onerror="this.src='https://placehold.co/200x280/0a0a0f/444?text=No+Image'" />
        ${badge}
        ${rating}
        ${seriesOverlay}
      </div>
      <div class="card-body">
        ${v.episodeTitle && v.episodeTitle !== v.title ? `<div class="card-title">${v.episodeTitle}</div>` : ''}
        ${v.date ? `<div class="card-date">${v.date}</div>` : ''}
      </div>
    </a>`;
}

const SEE_ALL_MAP = {
  'Monthly Releases': '/monthly/',
  'Recent Uncensored': '/uncensored/',
  'Recent Series': '/recent-series/',
  'Recent Episodes': '/recent-episodes/',
};

function renderSections(sections) {
  if (!sections.length) {
    main.innerHTML += `<div class="error-msg"><span>🎬</span>Tidak ada data ditemukan.</div>`;
    return;
  }
  main.innerHTML += sections.map(s => {
    const isEpisode = s.section === 'Recent Episodes';
    const gridClass = isEpisode ? 'grid grid-episode' : 'grid';
    const seeAllHref = SEE_ALL_MAP[s.section] || null;
    return `
      <div class="section-block">
        <div class="section-header">
          <h2 class="section-title">${s.section}</h2>
          <div class="section-actions">
          ${seeAllHref ? `<a href="${seeAllHref}" class="see-all-btn">SEE ALL</a>` : ''}
            ${!isEpisode ? `
              <button class="arrow-btn" onclick="scrollSection(this, -1)">‹</button>
              <button class="arrow-btn" onclick="scrollSection(this, 1)">›</button>` : ''}
          </div>
        </div>
        <div class="${gridClass}">
          ${s.videos.map(v => renderCard(v, isEpisode)).join('')}
        </div>
      </div>`;
  }).join('');
}

function scrollSection(btn, dir) {
  const grid = btn.closest('.section-block').querySelector('.grid');
  grid.scrollBy({ left: dir * 660, behavior: 'smooth' });
}

async function loadHome() {
  const placeholders = ['Monthly Releases', 'Recent Uncensored', 'Recent Series', 'Recent Episodes'];
  main.innerHTML = placeholders.map(t => `
    <div class="section-block">
      <div class="section-header">
        <h2 class="section-title">${t}</h2>
      </div>
      ${skeletonGrid()}
    </div>`).join('');

  try {
    const [homeRes] = await Promise.all([fetch(`${API}/home`)]);
    const json = await homeRes.json();
    if (!json.success) throw new Error(json.message);

    // Cek login untuk Continue Watching
    const token = localStorage.getItem('ez_token');
    let continueHtml = '';
    if (token) {
      try {
        const histRes = await fetch(`${API}/auth?action=history&limit=8`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const histJson = await histRes.json();
        if (histJson.success && histJson.data.length > 0) {
          continueHtml = renderContinueWatching(histJson.data);
        }
      } catch { /* silent */ }
    }

    main.innerHTML = continueHtml;
    renderSections(json.data);
  } catch (err) {
    main.innerHTML = `<div class="error-msg"><span>⚠️</span>${err.message}</div>`;
  }
}

function renderContinueWatching(items) {
  const cards = items.map(item => {
    const progress = item.watch_progress || 0;
    const href = `/episodes/${item.video_slug}/`;
    const cover = item.video_cover_url || 'https://placehold.co/200x280/0a0a0f/444?text=N/A';
    const progressBar = `
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,0.1)">
        <div style="height:100%;background:var(--accent);width:${Math.min(100, (progress / 1500) * 100)}%;border-radius:2px"></div>
      </div>`;
    return `
      <a class="card" href="${href}" title="${item.video_title || ''}">
        <div class="card-poster" style="position:relative">
          <img class="card-thumb" src="${cover}" alt="${item.video_title || ''}" loading="lazy"
            onerror="this.src='https://placehold.co/200x280/0a0a0f/444?text=N/A'" />
          <div class="card-series-overlay">${item.series_title || item.video_title || ''}</div>
          ${progressBar}
        </div>
        <div class="card-body">
          <div class="card-title">${item.video_title || ''}</div>
          ${progress > 0 ? `<div class="card-date">⏱ ${Math.floor(progress/60)}m ${progress%60}s</div>` : ''}
        </div>
      </a>`;
  }).join('');

  return `
    <div class="section-block">
      <div class="section-header">
        <h2 class="section-title">Continue Watching</h2>
        <div class="section-actions">
          <button class="arrow-btn" onclick="scrollSection(this, -1)">‹</button>
          <button class="arrow-btn" onclick="scrollSection(this, 1)">›</button>
        </div>
      </div>
      <div class="grid">${cards}</div>
    </div>`;
}

loadHome();
