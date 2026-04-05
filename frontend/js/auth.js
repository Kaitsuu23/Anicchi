// ─── Token helpers ───────────────────────────────────────────
function getToken() { return localStorage.getItem('ez_token'); }
function setToken(t) { localStorage.setItem('ez_token', t); }
function removeToken() { localStorage.removeItem('ez_token'); }

async function getUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth?action=me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) { removeToken(); return null; }
    const json = await res.json();
    return json.success ? json.user : null;
  } catch { return null; }
}

function signOut() {
  removeToken();
  location.href = '/';
}

// ─── Login ───────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.auth-btn');
  const errEl = document.getElementById('auth-error');

  setLoading(btn, true);
  clearMsg(errEl);

  try {
    const res = await fetch('/api/auth?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email.value.trim(),
        password: form.password.value,
      }),
    });
    const json = await res.json();

    if (!json.success) {
      showMsg(errEl, json.message);
      setLoading(btn, false);
      return;
    }

    setToken(json.token);
    const okEl = document.getElementById('auth-success');
    if (okEl) showMsg(okEl, 'Login berhasil! Mengalihkan...');
    setTimeout(() => {
      const redirect = new URLSearchParams(location.search).get('redirect') || '/';
      location.href = redirect;
    }, 800);
  } catch {
    showMsg(errEl, 'Gagal terhubung ke server.');
    setLoading(btn, false);
  }
}

// ─── Register ────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.auth-btn');
  const errEl = document.getElementById('auth-error');
  const okEl = document.getElementById('auth-success');
  const password = form.password.value;
  const confirm = form.confirm.value;

  clearMsg(errEl);
  clearMsg(okEl);

  if (password !== confirm) return showMsg(errEl, 'Password tidak cocok.');
  if (password.length < 6) return showMsg(errEl, 'Password minimal 6 karakter.');

  setLoading(btn, true);

  try {
    const res = await fetch('/api/auth?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.value.trim(),
        email: form.email.value.trim(),
        password,
      }),
    });
    const json = await res.json();

    setLoading(btn, false);

    if (!json.success) return showMsg(errEl, json.message);

    showMsg(okEl, 'Registrasi berhasil! Silakan login.', true);
    setTimeout(() => location.href = '/login', 1500);
  } catch {
    showMsg(errEl, 'Gagal terhubung ke server.');
    setLoading(btn, false);
  }
}

// ─── UI helpers ──────────────────────────────────────────────
function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Loading...' : btn.dataset.label;
}

function showMsg(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearMsg(el) {
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

// ─── Navbar auth slot ─────────────────────────────────────────
async function renderAuthNav(container) {
  const user = await getUser();
  if (!user) {
    container.innerHTML = `<a href="/login" class="nav-link">Login</a>`;
    return;
  }

  const username = user.username || user.email.split('@')[0];

  // Fetch avatar dari DB
  let avatarUrl = null;
  try {
    const res = await fetch('/api/auth?action=profile', { headers: { Authorization: `Bearer ${getToken()}` } });
    const json = await res.json();
    if (json.success) avatarUrl = json.data.avatar_url || null;
  } catch { /* silent */ }

  const avatarSmall = avatarUrl
    ? `<img src="${avatarUrl}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1.5px solid var(--glass-border);flex-shrink:0" />`
    : `<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--sub),var(--accent));display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:800;color:#fff;flex-shrink:0">${username[0].toUpperCase()}</div>`;

  const avatarLarge = avatarUrl
    ? `<img src="${avatarUrl}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0" />`
    : `<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--sub),var(--accent));display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:800;color:#fff;flex-shrink:0">${username[0].toUpperCase()}</div>`;

  const svgProfile  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`;
  const svgHistory  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95L6.64 18.36A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`;
  const svgLogout   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`;
  const svgChevron  = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>`;

  container.innerHTML = `
    <div class="nav-dropdown">
      <button class="nav-link dropdown-toggle" style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0.75rem">
        ${avatarSmall}
        <span>${username}</span>
        ${svgChevron}
      </button>
      <div class="dropdown-menu" id="user-menu">
        <div style="padding:0.85rem 1.25rem;border-bottom:1px solid var(--glass-border);display:flex;align-items:center;gap:0.75rem">
          ${avatarLarge}
          <div>
            <div style="font-size:0.9rem;font-weight:700;color:#fff">${username}</div>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:1px">${user.email}</div>
          </div>
        </div>
        <a class="dropdown-item" href="/profile" style="display:flex;align-items:center;gap:0.6rem">${svgProfile} Profile</a>
        <a class="dropdown-item" href="/history" style="display:flex;align-items:center;gap:0.6rem">${svgHistory} Watch History</a>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" onclick="signOut()" style="cursor:pointer;background:none;border:none;width:100%;text-align:left;color:#f87171;display:flex;align-items:center;gap:0.6rem">${svgLogout} Logout</button>
      </div>
    </div>
  `;
  const toggle = container.querySelector('.dropdown-toggle');
  const menu = container.querySelector('#user-menu');
  toggle.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
  document.addEventListener('click', () => menu.classList.remove('open'));
}

window.__renderAuthNavWhenReady = function () {
  const slot = document.getElementById('nav-auth-slot');
  if (slot) renderAuthNav(slot);
};

if (window.__navAuthSlotReady) window.__renderAuthNavWhenReady();
