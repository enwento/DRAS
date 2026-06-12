module.exports = async function handler(_req, res) {
  res.clearCookie('fitbit_session', { path: '/' });
  res.status(200).json({ ok: true });
};
