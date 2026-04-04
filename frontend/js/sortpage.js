// Shared sort handler untuk halaman dengan sort bar
// BASE_URL harus sudah didefinisikan sebelum script ini diload
window.SORTPAGE_HANDLES_LOAD = true;

(function() {
  // Baca filter dari URL saat load
  const urlFilter = new URLSearchParams(location.search).get('filter');
  const INIT_URL = urlFilter ? `${BASE_URL}?filter=${urlFilter}` : BASE_URL;

  // Highlight active sort btn saat load
  if (urlFilter) {
    document.querySelectorAll('.sort-btn').forEach(btn => {
      const isActive = btn.dataset.url?.includes(`filter=${urlFilter}`);
      btn.classList.toggle('active', isActive);
    });
  }

  // Sort button click handler
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      // Update URL browser
      const filterParam = btn.dataset.url?.includes('filter=')
        ? '?' + btn.dataset.url.split('?')[1] : '';
      const cleanPath = location.pathname.replace(/\/$/, '') + '/';
      window.history.pushState({}, '', cleanPath + filterParam);
      loadPage(btn.dataset.url);
    });
  });

  // Load dengan filter dari URL
  if (typeof loadPage === 'function') loadPage(INIT_URL);
})();
