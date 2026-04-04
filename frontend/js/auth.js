if (window.__authLoaded) throw new Error('auth.js already loaded');
window.__authLoaded = true;

const SUPABASE_URL = 'https://qjhjcpbftdrwsabzpwec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaGpjcGJmdGRyd3NhYnpwd2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTM0NDAsImV4cCI6MjA5MDg4OTQ0MH0.9twMdlMz17ql3Zfq8M8fcj1YEwZKLlYOcijFNFEwI7A';

let _sb = null;
function initSupabase() {
  if (!_sb && window.supabase) {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _sb;
}

async function getSession() {
  const sb = initSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session ?? null;
}

async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

async function signOut() {
  const sb = initSupabase();
  await sb.auth.signOut();
  location.href = '/';
}

// ─── Login ──────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.auth-btn');
  const errEl = document.getElementById('auth-error');

  setLoading(btn, true);
  clearMsg(errEl);

  const { error } = await initSupabase().auth.signInWithPassword({
    email: form.email.value.trim(),
    password: form.password.value,
  });

  if (error) {
    showMsg(errEl, friendlyError(error.message), 'error');
    setLoading(btn, false);
    return;
  }

  const redirect = new URLSearchParams(location.search).get('redirect') || '/';
  location.href = redirect;
}

// ─── Register ───────────────────────────────────────────────────

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

  if (password !== confirm) return showMsg(errEl, 'Password tidak cocok.', 'error');
  if (password.length < 6) return showMsg(errEl, 'Password minimal 6 karakter.', 'error');

  setLoading(btn, true);

  const { error } = await initSupabase().auth.signUp({
    email: form.email.value.trim(),
    password,
    options: { data: { username: form.username.value.trim() } },
  });

  setLoading(btn, false);

  if (error) return showMsg(errEl, friendlyError(error.message), 'error');

  showMsg(okEl, 'Registrasi berhasil! Cek email kamu untuk konfirmasi akun.', 'success');
  form.reset();
}

// ─── UI helpers ─────────────────────────────────────────────────

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Loading...' : btn.dataset.label;
}

function showMsg(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearMsg(el) {
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

function friendlyError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Email atau password salah.';
  if (msg.includes('Email not confirmed')) return 'Email belum dikonfirmasi. Cek inbox kamu.';
  if (msg.includes('User already registered')) return 'Email sudah terdaftar.';
  if (msg.includes('Password should be')) return 'Password minimal 6 karakter.';
  if (msg.includes('Unable to validate email')) return 'Format email tidak valid.';
  return msg;
}

// ─── Navbar auth slot ────────────────────────────────────────────

async function renderAuthNav(container) {
  const user = await getUser();
  if (!user) {
    container.innerHTML = `<a href="/login" class="nav-link">Login</a>`;
    return;
  }
  const sb = initSupabase();
  const { data: profile } = await sb.from('users').select('username').eq('id', user.id).single();
  const username = profile?.username || user.email.split('@')[0];

  container.innerHTML = `
    <div class="nav-dropdown">
      <button class="nav-link dropdown-toggle">👤 ${username} ▾</button>
      <div class="dropdown-menu" id="user-menu">
        <span class="dropdown-item" style="color:var(--muted);font-size:0.8rem">${user.email}</span>
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

// Dipanggil oleh navbar.js setelah slot siap
window.__renderAuthNavWhenReady = function () {
  const slot = document.getElementById('nav-auth-slot');
  if (slot) renderAuthNav(slot);
};

if (window.__navAuthSlotReady) window.__renderAuthNavWhenReady();
