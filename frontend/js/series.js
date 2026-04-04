const API = '/api';
const BASE_URL = 'https://hentaimama.io/hentai-series/';
const grid = document.getElementById('series-grid');
const paginationBar = document.getElementById('pagination');

// Baca filter dari URL saat load
const urlFilter = new URLSearchParams(location.search).get('filter');
const INIT_URL = urlFilter ? `${BASE_URL}?filter=${urlFilter}` : BASE_URL;

// Highlight active sort btn saat load
if (urlFilter) {
  const map = { rating: 'By Rating', weekly: 'week', monthly: 'month', alltime: 'all time', alphabet: 'A-Z' };
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.url?.includes(`filter=${urlFilter}`));
  });
}

let currentUrl = INIT_URL;

function skeletons(n = 18) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card series-skeleton">
      <div class="skeleton" style="width:100%;aspect-ratio:2/3;border-radius:10px"></div>
    </div>`).join('');
}

function renderCard(v) {
  const rating = v.rating
    ? `<span class="card-rating"><span class="star">★</span>${v.rating}</span>` : '';

  return `
    <a class="series-card" href="/detail/${v.link.replace(/\/$/, '').split('/').pop()}/" title="${v.title}">
      <div class="series-poster">
        <img src="${v.thumbnail || ''}" alt="${v.title}" loading="lazy"
          onerror="this.src='https://placehold.co/200x280/0a0a0f/444?text=No+Image'" />
        ${rating}
        <div class="series-overlay">${v.title}</div>
      </div>
    </a>`;
}

function setActive(selector, activeEl) {
  document.querySelectorAll(selector).forEach(el => el.classList.remove('active'));
  if (activeEl) activeEl.classList.add('active');
}

function pageUrl(base, n) {
  // Handle URL dengan query params (letter filter)
  if (base.includes('?')) {
    const urlObj = new URL(base);
    const cleanPath = urlObj.pathname.replace(/\/page\/\d+\/?$/, '').replace(/\/$/, '');
    urlObj.pathname = n === 1 ? cleanPath + '/' : cleanPath + `/page/${n}/`;
    return urlObj.toString();
  }
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

async function loadPage(url, triggerEl = null) {
  currentUrl = url;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  grid.innerHTML = skeletons();
  paginationBar.innerHTML = '';
  if (triggerEl) setActive('.sort-btn, .abc-btn', triggerEl);

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

// Sort buttons
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    setActive('.sort-btn', this);
    const filterParam = btn.dataset.url.includes('filter=') 
      ? '?' + btn.dataset.url.split('?')[1] : '';
    window.history.pushState({}, '', '/series/' + filterParam);
    loadPage(btn.dataset.url);
  });
});

loadPage(INIT_URL);
