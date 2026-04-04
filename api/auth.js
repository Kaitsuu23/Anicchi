const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDB } = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Route berdasarkan query: /api/auth?action=register|login|me
  const action = req.query.action;

  // ── ME ──────────────────────────────────────────────────────
  if (action === 'me') {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
      const payload = jwt.verify(auth.slice(7), JWT_SECRET);
      return res.json({ success: true, user: payload });
    } catch {
      return res.status(401).json({ success: false, message: 'Token tidak valid atau expired.' });
    }
  }

  if (req.method !== 'POST')
    return res.status(405).json({ success: false, message: 'Method not allowed' });

  const db = getDB();

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
