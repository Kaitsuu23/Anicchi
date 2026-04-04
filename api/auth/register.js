const bcrypt = require('bcryptjs');
const { getDB } = require('../../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { username, email, password } = req.body || {};

  if (!username || !email || !password)
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });

  if (username.length < 3 || username.length > 50)
    return res.status(400).json({ success: false, message: 'Username harus 3-50 karakter.' });

  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });

  const db = getDB();

  // Cek duplikat
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
};
