const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    return res.json({ success: true, user: payload });
  } catch {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau expired.' });
  }
};
