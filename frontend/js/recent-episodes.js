const API = '/api';
const BASE_URL = 'https://hentaimama.io/recent-episodes/';
const grid = document.getElementById('ep-grid');
const paginationBar = document.getElementById('pagination');

function skeletons(n = 12) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card" style="flex:unset;width:100%">
      <div class="skeleton skeleton-thumb" style="aspect-ratio:16/9;border-radius:10px"></div>
      <div class="skeleton skeleton-line" style="margin:.5rem 0 .3rem"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>`).join('');
}

function renderCard(v) {
  const badge = v.badge
    ? `<span class="badge badge-${v.badge.toLowerCase().trim()}">${v.badge.trim()}</span>` : '';
  const overlay = v.title
    ? `<div class="card-series-overlay">${v.title}</div>` : '';

  return `
    <a class="card card-episode" href="/episodes/${v.link.replace(/\/$/, '').split('/').pop()}/" title="${v.title}">
      <div class="card-poster card-poster-landscape">
        <img class="card-thumb" src="${v.thumbnail || ''}" alt="${v.title}" loading="lazy"
          onerror="this.src='https://placehold.co/320x180/0a0a0f/444?text=No+Image'" />
        ${badge}${overlay}
      </div>
      <div class="card-body">
        ${v.episodeTitle && v.episodeTitle !== v.title ? `<div class="card-title">${v.episodeTitle}</div>` : ''}
        ${v.date ? `<div class="card-date">${v.date}</div>` : ''}
      </div>
    </a>`;
}

function pageUrl(base, n) {
  const clean = base.replace(/\/page\/\d+\/?/, '/').replace(/\/$/, '');
  return n === 1 ? clean + '/' : clean + `/page/${n}/`;
}

function renderPagination(currentPage, lastPage, baseUrl) {
  if (lastPage <= 1) { paginationBar.innerHTML = ''; return; }
  const delta = 1;
  const pages = [];
  if (currentPage > 1)
    pages.push(`<button class="page-btn page-nav" onclick="loadPage('${pageUrl(baseUrl, currentPage - 1)}')">‹</button>`);
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(lastPage, currentPage + delta); i++)
    pages.push(`<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="loadPage('${pageUrl(baseUrl, i)}')">${i}</button>`);
  if (currentPage < lastPage)
    pages.push(`<button class="page-btn page-nav" onclick="loadPage('${pageUrl(baseUrl, currentPage + 1)}')">›</button>`);
  paginationBar.innerHTML = pages.join('');
}

async function loadPage(url) {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  grid.innerHTML = skeletons();
  paginationBar.innerHTML = '';

  try {
    const res = await fetch(`${API}/list?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    const { videos, currentPage, lastPage, basePageUrl } = json.data;
    grid.innerHTML = videos.length
      ? videos.map(renderCard).join('')
      : `<div class="error-msg"><span>🎬</span>Tidak ada data.</div>`;
    renderPagination(currentPage, lastPage, basePageUrl);
  } catch (err) {
    grid.innerHTML = `<div class="error-msg"><span>⚠️</span>${err.message}</div>`;
  }
}

loadPage(BASE_URL);
