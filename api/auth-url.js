const { buildAuthUrl, createState } = require('../lib/fitbit');

module.exports = async function handler(req, res) {
  try {
    const state = createState();
    res.status(200).json({ authUrl: buildAuthUrl(state), state });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
