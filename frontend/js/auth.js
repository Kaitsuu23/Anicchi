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
  container.innerHTML = `
    <div class="nav-dropdown">
      <button class="nav-link dropdown-toggle">👤 ${user.username} ▾</button>
      <div class="dropdown-menu" id="user-menu">
        <span class="dropdown-item" style="color:var(--muted);font-size:0.8rem">${user.email}</span>
        <div class="dropdown-divider"></div>
        <a class="dropdown-item" href="/history">📺 Watch History</a>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" onclick="signOut()" style="cursor:pointer;background:none;border:none;width:100%;text-align:left;color:inherit">🚪 Logout</button>
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
