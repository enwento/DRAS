function encodeSession(data) {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64url');
}

function decodeSession(value) {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 30
  };
}

module.exports = { encodeSession, decodeSession, cookieOptions };
