const API = '/api';

async function loadGenres() {
  const container = document.getElementById('genres-list');
  try {
    const res = await fetch(`${API}/genres`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    container.innerHTML = json.data.map(g => `
      <a class="genre-pill" href="/genre/${g.url.split('/genre/')[1]}">
        ${g.name}
      </a>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="error-msg"><span>⚠️</span>${err.message}</div>`;
  }
}

loadGenres();
