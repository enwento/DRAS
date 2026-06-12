const { exchangeCodeForToken } = require('../lib/fitbit');
const { encodeSession, cookieOptions } = require('../lib/session');

module.exports = async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const token = await exchangeCodeForToken(code);
    res.cookie('fitbit_session', encodeSession(token), cookieOptions());
    res.redirect('/?connected=1');
  } catch (error) {
    res.status(500).send(error.message);
  }
};
