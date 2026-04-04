const API = '/api';
const grid = document.getElementById('page-grid');
const paginationBar = document.getElementById('pagination');

function skeletons(n = 18) {
  return Array.from({ length: n }, () => `
    <div class="series-skeleton">
      <div class="skeleton" style="width:100%;aspect-ratio:2/3;border-radius:10px"></div>
    </div>`).join('');
}

function renderCard(v) {
  const badge = v.badge
    ? `<span class="badge badge-${v.badge.toLowerCase().trim()}">${v.badge.trim()}</span>` : '';
  const rating = v.rating
    ? `<span class="card-rating"><span class="star">★</span>${v.rating}</span>` : '';
  const linkPrefix = (typeof CARD_LINK_PREFIX !== 'undefined') ? CARD_LINK_PREFIX : '/episodes';
  const slug = v.link.replace(/\/$/, '').split('/').pop();
  const href = linkPrefix === '/detail' ? `/detail/${slug}/` : `/episodes/${slug}/`;

  return `
    <a class="series-card" href="${href}" title="${v.title}">
      <div class="series-poster">
        <img src="${v.thumbnail || ''}" alt="${v.title}" loading="lazy"
          onerror="this.src='https://placehold.co/200x280/0a0a0f/444?text=No+Image'" />
        ${badge}${rating}
        <div class="series-overlay">${v.title}</div>
      </div>
      ${v.episodeTitle && v.episodeTitle !== v.title ? `<div class="card-title" style="padding:.3rem .1rem;font-size:.85rem;font-weight:600">${v.episodeTitle}</div>` : ''}
      ${v.date ? `<div class="card-date" style="padding:.1rem .1rem;font-size:.7rem">${v.date}</div>` : ''}
    </a>`;
}

function pageUrl(base, n) {
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

  // Prev
  if (currentPage > 1) {
    pages.push(`<button class="page-btn page-nav" onclick="loadPage('${pageUrl(baseUrl, currentPage - 1)}')">‹</button>`);
  }

  // Hanya window ±2 dari current
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(lastPage, currentPage + delta); i++) {
    pages.push(`<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="loadPage('${pageUrl(baseUrl, i)}')">${i}</button>`);
  }

  // Next
  if (currentPage < lastPage) {
    pages.push(`<button class="page-btn page-nav" onclick="loadPage('${pageUrl(baseUrl, currentPage + 1)}')">›</button>`);
  }

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

// Support async BASE_URL dari genre.html
// Jika window.SORTPAGE_HANDLES_LOAD = true, jangan auto-load
if (window.SORTPAGE_HANDLES_LOAD) {
  // sortpage.js akan handle load
} else if (typeof BASE_URL !== 'undefined' && BASE_URL) {
  loadPage(BASE_URL);
} else {
  const wait = setInterval(() => {
    if (window._GENRE_BASE_URL) {
      clearInterval(wait);
      loadPage(window._GENRE_BASE_URL);
    }
  }, 50);
}
