const API = '/api';
const content = document.getElementById('list-content');
const abcJump = document.getElementById('abc-jump');

async function loadList() {
  content.innerHTML = `<div class="skeleton skeleton-line" style="height:16px;margin-bottom:.5rem"></div>`.repeat(10);

  try {
    const res = await fetch(`${API}/hentai-list`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const sections = json.data;

    // ABC jump bar
    abcJump.innerHTML = sections.map(s => `
      <a class="abc-btn" href="#letter-${s.letter}">${s.letter}</a>
    `).join('');

    // Render sections
    content.innerHTML = sections.map(s => `
      <div class="hl-section" id="letter-${s.letter}">
        <div class="hl-letter">${s.letter}</div>
        <div class="hl-items">
          ${s.items.map(v => `
            <a class="hl-item" href="/episodes/${v.link.replace(/\/$/, '').split('/').pop()}/">${v.title}</a>
          `).join('')}
        </div>
      </div>
    `).join('');

  } catch (err) {
    content.innerHTML = `<div class="error-msg"><span>⚠️</span>${err.message}</div>`;
  }
}

loadList();
