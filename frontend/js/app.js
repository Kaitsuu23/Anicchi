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
  const block = btn.closest('.section-block');
  const grid = block.querySelector('.cw-grid') || block.querySelector('.grid');
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
    const cover = item.video_cover_url || 'https://placehold.co/320x180/0a0a0f/444?text=N/A';
    const pct = Math.min(100, Math.round((progress / 1500) * 100));
    const timeStr = progress > 0 ? `${Math.floor(progress/60)}:${String(progress%60).padStart(2,'0')}` : '';
    return `
      <a class="cw-card" href="${href}" title="${item.video_title || ''}">
        <div class="cw-thumb">
          <img src="${cover}" alt="${item.video_title || ''}" loading="lazy"
            onerror="this.src='https://placehold.co/320x180/0a0a0f/444?text=N/A'" />
          <div class="cw-overlay">
            <div class="cw-play">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M8 5v14l11-7z"/></svg>
            </div>
            ${timeStr ? `<span class="cw-time">${timeStr}</span>` : ''}
          </div>
          <div class="cw-progress">
            <div class="cw-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="cw-title">${item.series_title || item.video_title || ''}</div>
      </a>`;
  }).join('');

  return `
    <style>
      .cw-grid { display:flex; gap:1rem; overflow-x:auto; padding:0.5rem 0.5rem 1rem; scrollbar-width:thin; scrollbar-color:var(--accent) transparent; }
      .cw-grid::-webkit-scrollbar { height:4px; }
      .cw-grid::-webkit-scrollbar-thumb { background:var(--accent); border-radius:4px; }
      .cw-card { flex:0 0 220px; text-decoration:none; color:inherit; transition:transform 0.3s ease; }
      .cw-card:hover { transform:translateY(-4px); }
      .cw-thumb { position:relative; width:100%; aspect-ratio:16/9; border-radius:10px; overflow:hidden; background:#000; border:1px solid var(--glass-border); }
      .cw-thumb img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; }
      .cw-card:hover .cw-thumb img { transform:scale(1.05); filter:brightness(0.7); }
      .cw-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.3s; }
      .cw-card:hover .cw-overlay { opacity:1; }
      .cw-play { width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.15); backdrop-filter:blur(8px); border:1.5px solid rgba(255,255,255,0.4); display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 4px 20px rgba(0,0,0,0.5); }
      .cw-time { position:absolute; bottom:28px; right:8px; font-size:0.7rem; font-weight:700; background:rgba(0,0,0,0.75); padding:2px 6px; border-radius:4px; color:#fff; }
      .cw-progress { position:absolute; bottom:0; left:0; right:0; height:3px; background:rgba(255,255,255,0.15); }
      .cw-progress-fill { height:100%; background:var(--accent); border-radius:2px; }
      .cw-title { font-size:0.78rem; font-weight:600; color:var(--muted); margin-top:0.5rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .cw-card:hover .cw-title { color:#fff; }
    </style>
    <div class="section-block">
      <div class="section-header">
        <h2 class="section-title">Continue Watching</h2>
        <div class="section-actions">
          <button class="arrow-btn" onclick="scrollSection(this, -1)">‹</button>
          <button class="arrow-btn" onclick="scrollSection(this, 1)">›</button>
        </div>
      </div>
      <div class="cw-grid">${cards}</div>
    </div>`;
}

loadHome();
