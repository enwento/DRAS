const { decodeSession, encodeSession, cookieOptions } = require('../lib/session');
const { fetchDailyData, refreshToken, toAppleHealthXml } = require('../lib/fitbit');

module.exports = async function handler(req, res) {
  const session = decodeSession(req.cookies?.fitbit_session);
  if (!session) return res.status(401).json({ error: 'Not connected to Fitbit' });

  try {
    let activeSession = session;
    if (session.expires_in && session.refresh_token) {
      activeSession = await refreshToken(session.refresh_token);
      res.cookie('fitbit_session', encodeSession(activeSession), cookieOptions());
    }

    const data = await fetchDailyData(activeSession.access_token);
    const xml = toAppleHealthXml(data);

    res.status(200).json({
      syncedAt: new Date().toISOString(),
      summary: data.activities.summary,
      restingHeartRate: data.heart?.['activities-heart']?.[0]?.value?.restingHeartRate || null,
      sleepEntries: (data.sleep?.sleep || []).length,
      weightEntries: (data.weight?.weight || []).length,
      ecg: 'Fitbit ECG is not exposed through Fitbit public API; cannot auto-sync directly.',
      appleHealthXml: xml
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
