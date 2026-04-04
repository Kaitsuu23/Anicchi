// Supabase config — ganti dengan project URL dan anon key kamu
// Dapatkan dari: https://supabase.com/dashboard → Project Settings → API
const SUPABASE_URL = 'https://qjhjcpbftdrwsabzpwec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaGpjcGJmdGRyd3NhYnpwd2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTM0NDAsImV4cCI6MjA5MDg4OTQ0MH0.9twMdlMz17ql3Zfq8M8fcj1YEwZKLlYOcijFNFEwI7A';

// Load Supabase via CDN (dipanggil dari HTML)
let supabase = null;

function initSupabase() {
  if (window.supabase && !supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

// ─── Auth helpers ───────────────────────────────────────────────

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
  const email = form.email.value.trim();
  const password = form.password.value;
  const btn = form.querySelector('.auth-btn');
  const errEl = document.getElementById('auth-error');

  setLoading(btn, true);
  clearError(errEl);

  const sb = initSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    showError(errEl, friendlyError(error.message));
    setLoading(btn, false);
    return;
  }

  // Redirect ke halaman sebelumnya atau home
  const redirect = new URLSearchParams(location.search).get('redirect') || '/';
  location.href = redirect;
}

// ─── Register ───────────────────────────────────────────────────

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirm = form.confirm.value;
  const username = form.username.value.trim();
  const btn = form.querySelector('.auth-btn');
  const errEl = document.getElementById('auth-error');
  const successEl = document.getElementById('auth-success');

  clearError(errEl);
  clearError(successEl);

  if (password !== confirm) {
    showError(errEl, 'Password tidak cocok.');
    return;
  }
  if (password.length < 6) {
    showError(errEl, 'Password minimal 6 karakter.');
    return;
  }

  setLoading(btn, true);

  const sb = initSupabase();
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });

  if (error) {
    showError(errEl, friendlyError(error.message));
    setLoading(btn, false);
    return;
  }

  setLoading(btn, false);
  showSuccess(successEl, 'Registrasi berhasil! Cek email kamu untuk konfirmasi akun.');
  form.reset();
}

// ─── UI helpers ─────────────────────────────────────────────────

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Loading...' : btn.dataset.label;
}

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError(el) {
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

function showSuccess(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function friendlyError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Email atau password salah.';
  if (msg.includes('Email not confirmed')) return 'Email belum dikonfirmasi. Cek inbox kamu.';
  if (msg.includes('User already registered')) return 'Email sudah terdaftar.';
  if (msg.includes('Password should be')) return 'Password minimal 6 karakter.';
  if (msg.includes('Unable to validate email')) return 'Format email tidak valid.';
  return msg;
}

// ─── Navbar user state ──────────────────────────────────────────

async function renderAuthNav(container) {
  const user = await getUser();
  if (!user) {
    container.innerHTML = `<a href="/login" class="nav-link">Login</a>`;
    return;
  }

  // Ambil dari public.users
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
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.toggle('open');
  });
  document.addEventListener('click', () => menu.classList.remove('open'));
}
