const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDB } = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET;

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); }
  catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;
  const db = getDB();

  // ── ME ───────────────────────────────────────────────────────
  if (action === 'me') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    return res.json({ success: true, user });
  }

  // ── PROFILE GET ──────────────────────────────────────────────
  if (action === 'profile' && req.method === 'GET') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { data, error } = await db.from('users')
      .select('id, username, email, avatar_url, role, created_at')
      .eq('id', user.id).single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    // Stats
    const [{ count: histCount }, { count: favCount }] = await Promise.all([
      db.from('user_watch_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      db.from('user_favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    return res.json({ success: true, data: { ...data, stats: { watched: histCount || 0, favorites: favCount || 0 } } });
  }

  // ── PROFILE UPDATE ───────────────────────────────────────────
  if (action === 'profile' && req.method === 'POST') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { username, avatar_url, current_password, new_password } = req.body || {};
    const updates = {};

    if (username) {
      if (username.length < 3 || username.length > 50)
        return res.status(400).json({ success: false, message: 'Username harus 3-50 karakter.' });
      // Cek duplikat
      const { data: existing } = await db.from('users').select('id').eq('username', username).neq('id', user.id).maybeSingle();
      if (existing) return res.status(409).json({ success: false, message: 'Username sudah digunakan.' });
      updates.username = username;
    }
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    // Ganti password
    if (new_password) {
      if (!current_password) return res.status(400).json({ success: false, message: 'Password lama wajib diisi.' });
      if (new_password.length < 6) return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
      const { data: u } = await db.from('users').select('password_hash').eq('id', user.id).single();
      const valid = await bcrypt.compare(current_password, u.password_hash);
      if (!valid) return res.status(401).json({ success: false, message: 'Password lama salah.' });
      updates.password_hash = await bcrypt.hash(new_password, 12);
    }

    if (!Object.keys(updates).length)
      return res.status(400).json({ success: false, message: 'Tidak ada yang diubah.' });

    const { error } = await db.from('users').update(updates).eq('id', user.id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, message: 'Profil berhasil diperbarui.' });
  }

  // ── HISTORY GET ──────────────────────────────────────────────
  if (action === 'history' && req.method === 'GET') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const limit = parseInt(req.query.limit) || 12;
    const { data, error } = await db
      .from('user_watch_history')
      .select('*')
      .eq('user_id', user.id)
      .order('last_watched', { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, data: data || [] });
  }

  // ── HISTORY SAVE ─────────────────────────────────────────────
  if (action === 'history' && req.method === 'POST') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { video_slug, video_title, video_cover_url, series_slug, series_title, watch_progress, video_duration } = req.body || {};
    if (!video_slug) return res.status(400).json({ success: false, message: 'video_slug required' });
    const { error } = await db.from('user_watch_history').upsert({
      user_id: user.id,
      video_slug,
      video_title: video_title || null,
      video_cover_url: video_cover_url || null,
      series_slug: series_slug || null,
      series_title: series_title || null,
      watch_progress: watch_progress || 0,
      video_duration: video_duration || null,
      last_watched: new Date().toISOString(),
    }, { onConflict: 'user_id,video_slug' });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  // ── HISTORY DELETE ───────────────────────────────────────────
  if (action === 'history' && req.method === 'DELETE') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { video_slug } = req.body || {};
    if (!video_slug) return res.status(400).json({ success: false, message: 'video_slug required' });
    await db.from('user_watch_history').delete().eq('user_id', user.id).eq('video_slug', video_slug);
    return res.json({ success: true });
  }

  if (req.method !== 'POST')
    return res.status(405).json({ success: false, message: 'Method not allowed' });

  // ── REGISTER ─────────────────────────────────────────────────
  if (action === 'register') {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password)
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
    if (username.length < 3 || username.length > 50)
      return res.status(400).json({ success: false, message: 'Username harus 3-50 karakter.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });

    const { data: existing } = await db
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (existing)
      return res.status(409).json({ success: false, message: 'Email atau username sudah digunakan.' });

    const password_hash = await bcrypt.hash(password, 12);
    const { data: user, error } = await db
      .from('users')
      .insert({ username, email, password_hash })
      .select('id, username, email, role, created_at')
      .single();

    if (error)
      return res.status(500).json({ success: false, message: 'Gagal membuat akun.' });

    return res.status(201).json({ success: true, message: 'Registrasi berhasil!', user });
  }

  // ── LOGIN ────────────────────────────────────────────────────
  if (action === 'login') {
    const { email, password } = req.body || {};

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });

    const { data: user } = await db
      .from('users')
      .select('id, username, email, password_hash, role, is_active')
      .eq('email', email)
      .maybeSingle();

    if (!user)
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    if (!user.is_active)
      return res.status(403).json({ success: false, message: 'Akun kamu dinonaktifkan.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.from('user_sessions').insert({
      user_id: user.id,
      token_hash,
      expires_at,
      user_agent: req.headers['user-agent'] || null,
      ip_address: req.headers['x-forwarded-for']?.split(',')[0] || null,
    });

    return res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  }

  return res.status(400).json({ success: false, message: 'Action tidak dikenal.' });
};
