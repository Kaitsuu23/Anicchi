const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../../lib/db');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = '7d';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { email, password } = req.body || {};

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });

  const db = getDB();

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
    { expiresIn: JWT_EXPIRES }
  );

  // Simpan session
  const token_hash = require('crypto').createHash('sha256').update(token).digest('hex');
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.from('user_sessions').insert({
    user_id: user.id,
    token_hash,
    expires_at,
    user_agent: req.headers['user-agent'] || null,
    ip_address: req.headers['x-forwarded-for']?.split(',')[0] || null,
  });

  return res.status(200).json({
    success: true,
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
};
