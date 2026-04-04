const NAVBAR_API = '/api';
const currentPage = location.pathname.replace(/^\//, '').split('/')[0] || '';

// Inject Supabase CDN + auth.js jika belum ada
(function injectAuth() {
  if (document.querySelector('script[src*="auth.js"]')) return; // sudah ada, skip
  if (!document.querySelector('script[src*="supabase"]')) {
    const sb = document.createElement('script');
    sb.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    sb.onload = () => {
      const auth = document.createElement('script');
      auth.src = '/js/auth.js';
      document.head.appendChild(auth);
    };
    document.head.appendChild(sb);
  } else {
    const auth = document.createElement('script');
    auth.src = '/js/auth.js';
    document.head.appendChild(auth);
  }
})();

const NAV_ITEMS = [
  { label: 'Series', href: '/series/', id: 'series' },
  { label: 'Uncensored', href: '/uncensored/', id: 'uncensored' },
  { label: 'List', href: '/hentai-list/', id: 'hentai-list' },
  { label: '3D', href: '/threed/', id: 'threed' },
];

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('nav');
  if (!nav) return;
  const subtitle = nav.dataset.subtitle || nav.querySelector('.nav-subtitle')?.textContent || '';

  const links = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="nav-link ${currentPage === item.id ? 'active' : ''}">${item.label}</a>
  `).join('');

  const isGenrePage = currentPage === 'genres' || currentPage === 'genre';
  const searchVal = currentPage === 'search' ? decodeURIComponent(location.pathname.replace(/^\/search\//, '').replace(/\/$/, '')) : '';

  nav.innerHTML = `
    <div class="nav-left">
      <a href="/" class="nav-logo">⬡ EcchiZone</a>
      ${subtitle ? `<div class="nav-subtitle">${subtitle}</div>` : ''}
    </div>
    <div class="nav-center">
      ${links}
      <div class="nav-dropdown">
        <button class="nav-link dropdown-toggle ${isGenrePage ? 'active' : ''}">Genres ▾</button>
        <div class="dropdown-menu" id="genres-menu"></div>
      </div>
    </div>
    <div class="nav-right">
      <form class="nav-search" onsubmit="event.preventDefault(); const q=this.q.value.trim(); if(q) location.href='/search/'+encodeURIComponent(q)+'/'">
        <input name="q" class="nav-search-input" placeholder="Search..." autocomplete="off" value="${searchVal}" />
        <button type="submit" class="nav-search-btn"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
      </form>
      <div id="nav-auth-slot" class="nav-links-right"></div>
    </div>
  `;

  const toggle = nav.querySelector('.dropdown-toggle');
  const menu = nav.querySelector('#genres-menu');
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    if (!menu.classList.contains('open')) loadGenresMenu(menu);
    menu.classList.toggle('open');
  });
  document.addEventListener('click', () => menu.classList.remove('open'));

  // Render auth state — dipanggil dari auth.js setelah load
  window.__navAuthSlotReady = true;
  if (typeof window.__renderAuthNavWhenReady === 'function') {
    window.__renderAuthNavWhenReady();
  }
});

async function loadGenresMenu(menu) {
  menu.innerHTML = '<span class="dropdown-loading">Loading...</span>';
  try {
    const res = await fetch(`${NAVBAR_API}/genres`);
    const json = await res.json();
    if (!json.success) throw new Error();
    menu.innerHTML = `
      <a class="dropdown-item dropdown-seeall" href="/genres">📋 See All Genres</a>
      <div class="dropdown-divider"></div>
      ${json.data.map(g => `
        <a class="dropdown-item" href="/genre/${g.url.split('/genre/')[1]}">${g.name}</a>
      `).join('')}
    `;
  } catch {
    menu.innerHTML = '<span class="dropdown-loading">Gagal load</span>';
  }
}
