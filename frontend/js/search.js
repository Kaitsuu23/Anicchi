const API = '/api';
const grid = document.getElementById('search-grid');
const titleEl = document.getElementById('search-title');

const q = decodeURIComponent(location.pathname.replace(/^\/search\//, '').replace(/\/$/, '')) ||
          new URLSearchParams(location.search).get('q') || '';
document.title = `"${q}" – EcchiZone`;
titleEl.textContent = q ? `Results: "${q}"` : 'Search';

function skeletons(n = 6) {
  return Array.from({ length: n }, () => `
    <div class="search-item skeleton-search">
      <div class="skeleton" style="width:120px;height:170px;border-radius:8px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:.5rem;padding:.5rem 0">
        <div class="skeleton skeleton-line" style="width:70%;height:16px"></div>
        <div class="skeleton skeleton-line" style="width:30%;height:12px"></div>
        <div class="skeleton skeleton-line" style="width:50%;height:12px"></div>
      </div>
    </div>`).join('');
}

function renderItem(v) {
  const tags = (v.tags || []).map(t =>
    `<span class="search-tag" onclick="event.stopPropagation();location.href='/genre/${encodeURIComponent(t)}'">${t}</span>`
  ).join('');

  return `
    <div class="search-item" onclick="location.href='/episodes/${v.link.replace(/\/$/, '').split('/').pop()}/'">
      <img class="search-thumb" src="${v.thumbnail || ''}" alt="${v.title}"
        onerror="this.src='https://placehold.co/110x155/0a0a0f/444?text=No+Image'" />
      <div class="search-info">
        <div class="search-title">${v.title}</div>
        <div class="search-meta">
          ${v.rating ? `<span class="search-rating">⭐ ${v.rating}</span>` : ''}
          ${v.year ? `<span class="search-year">${v.year}</span>` : ''}
        </div>
        <div class="search-tags">${tags}</div>
      </div>
    </div>`;
}

async function doSearch(query) {
  if (!query) { grid.innerHTML = ''; return; }
  grid.innerHTML = skeletons();
  try {
    const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    grid.innerHTML = json.data.length
      ? json.data.map(renderItem).join('')
      : `<div class="no-results">
          <h2>No results to show with <strong>${query}</strong></h2>
          <p class="suggestions-title">Suggestions:</p>
          <ul class="suggestions-list">
            <li>Make sure all words are spelled correctly.</li>
            <li>Try different keywords.</li>
            <li>Try more general keywords.</li>
          </ul>
        </div>`;
  } catch (err) {
    grid.innerHTML = `<div class="error-msg"><span>⚠️</span>${err.message}</div>`;
  }
}

doSearch(q);
