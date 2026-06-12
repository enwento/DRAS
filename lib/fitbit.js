const FITBIT_AUTH_BASE = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token';
const FITBIT_API_BASE = 'https://api.fitbit.com';

function mustEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createState() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildAuthUrl(state) {
  const clientId = mustEnv('FITBIT_CLIENT_ID');
  const redirectUri = mustEnv('FITBIT_REDIRECT_URI');
  const scope = [
    'activity',
    'heartrate',
    'sleep',
    'weight',
    'profile',
    'nutrition'
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    expires_in: '604800',
    prompt: 'login consent',
    state
  });

  return `${FITBIT_AUTH_BASE}?${params.toString()}`;
}

function basicAuthHeader() {
  const clientId = mustEnv('FITBIT_CLIENT_ID');
  const clientSecret = mustEnv('FITBIT_CLIENT_SECRET');
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

async function exchangeCodeForToken(code) {
  const redirectUri = mustEnv('FITBIT_REDIRECT_URI');
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${err}`);
  }

  return response.json();
}

async function refreshToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${err}`);
  }

  return response.json();
}

async function fitbitGet(path, accessToken) {
  const response = await fetch(`${FITBIT_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fitbit API error ${response.status} at ${path}: ${text}`);
  }
  return response.json();
}

async function fetchDailyData(accessToken, date = 'today') {
  const [activities, heart, sleep, weight] = await Promise.all([
    fitbitGet(`/1/user/-/activities/date/${date}.json`, accessToken),
    fitbitGet(`/1/user/-/activities/heart/date/${date}/1d.json`, accessToken),
    fitbitGet(`/1.2/user/-/sleep/date/${date}.json`, accessToken),
    fitbitGet(`/1/user/-/body/log/weight/date/${date}.json`, accessToken)
  ]);

  return { activities, heart, sleep, weight };
}

function toAppleHealthXml(data) {
  const now = new Date();
  const source = 'Fitbit Smart Sync';
  const records = [];

  const summary = data.activities?.summary || {};
  if (summary.steps) {
    records.push(record('HKQuantityTypeIdentifierStepCount', summary.steps, 'count', now, source));
  }
  if (summary.caloriesOut) {
    records.push(record('HKQuantityTypeIdentifierActiveEnergyBurned', summary.caloriesOut, 'kcal', now, source));
  }
  if (summary.distances?.length) {
    const totalKm = summary.distances.reduce((acc, d) => acc + (d.distance || 0), 0);
    records.push(record('HKQuantityTypeIdentifierDistanceWalkingRunning', totalKm, 'km', now, source));
  }

  const resting = data.heart?.['activities-heart']?.[0]?.value?.restingHeartRate;
  if (resting) {
    records.push(record('HKQuantityTypeIdentifierRestingHeartRate', resting, 'count/min', now, source));
  }

  const intraday = data.heart?.['activities-heart-intraday']?.dataset || [];
  intraday.forEach((sample) => {
    const time = isoAtToday(sample.time);
    records.push(record('HKQuantityTypeIdentifierHeartRate', sample.value, 'count/min', time, source));
  });

  const weight = data.weight?.weight?.[0]?.weight;
  if (weight) {
    records.push(record('HKQuantityTypeIdentifierBodyMass', weight, 'kg', now, source));
  }

  (data.sleep?.sleep || []).forEach((entry) => {
    records.push(
      `<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="${source}" sourceVersion="1" unit="" creationDate="${fmt(now)}" startDate="${fmt(new Date(entry.startTime))}" endDate="${fmt(new Date(entry.endTime))}" value="${entry.isMainSleep ? 'HKCategoryValueSleepAnalysisAsleep' : 'HKCategoryValueSleepAnalysisInBed'}"/>`
    );
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<HealthData locale="en_US">\n${records.join('\n')}\n</HealthData>`;
}

function record(type, value, unit, date, source) {
  const formatted = fmt(new Date(date));
  return `<Record type="${type}" sourceName="${source}" sourceVersion="1" unit="${unit}" creationDate="${formatted}" startDate="${formatted}" endDate="${formatted}" value="${value}"/>`;
}

function fmt(d) {
  return d.toISOString().replace('T', ' ').replace('Z', ' +0000');
}

function isoAtToday(hhmmss) {
  const [h, m, s] = hhmmss.split(':').map((v) => Number(v));
  const date = new Date();
  date.setHours(h || 0, m || 0, s || 0, 0);
  return date;
}

module.exports = {
  createState,
  buildAuthUrl,
  exchangeCodeForToken,
  refreshToken,
  fetchDailyData,
  toAppleHealthXml
};
