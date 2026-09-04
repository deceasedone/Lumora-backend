const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const COOKIE_NAME = 'lumora_rt';

const isProduction = () => process.env.NODE_ENV === 'production';

// Refresh tokens are opaque random strings; only their hash is stored, so a
// database leak can't be replayed as a valid session.
const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });

const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  // Cross-site in production (separate API domain) needs None; Lax is safer in dev.
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
});

async function issueRefreshToken(userId, req) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, $3, $4)',
    [userId, hash(token), expiresAt, (req.headers['user-agent'] || '').slice(0, 255)]
  );

  return token;
}

async function startSession(res, req, userId) {
  const refreshToken = await issueRefreshToken(userId, req);
  res.cookie(COOKIE_NAME, refreshToken, cookieOptions());
  return signAccessToken(userId);
}

// Two tabs booting at once both present the same cookie, so a hard revoke would
// sign one of them out. A token rotated within this window is treated as that
// race; reuse after it is treated as theft.
const REUSE_GRACE_SECONDS = Number(process.env.REFRESH_REUSE_GRACE_SECONDS || 60);

// Rotates on every use: the presented token is revoked and a fresh one issued,
// so a stolen token stops working as soon as the real client refreshes.
async function rotateSession(res, req, presentedToken) {
  const result = await db.query(
    `SELECT id, user_id, revoked_at, (expires_at > NOW()) AS live,
            (revoked_at IS NOT NULL AND revoked_at > NOW() - ($2 || ' seconds')::interval) AS within_grace
     FROM refresh_tokens WHERE token_hash = $1`,
    [hash(presentedToken), REUSE_GRACE_SECONDS]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  if (!row.live) return null;

  if (row.revoked_at && !row.within_grace) {
    // Replayed long after rotation: assume the token leaked and end every
    // session for this user rather than handing out a fresh one.
    console.warn(`Refresh token reuse detected for user ${row.user_id}; revoking all sessions.`);
    await revokeAllForUser(row.user_id);
    return null;
  }

  if (!row.revoked_at) {
    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [row.id]);
  }

  const nextToken = await issueRefreshToken(row.user_id, req);
  res.cookie(COOKIE_NAME, nextToken, cookieOptions());

  return { userId: row.user_id, accessToken: signAccessToken(row.user_id) };
}

async function revokeSession(res, presentedToken) {
  if (presentedToken) {
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
      [hash(presentedToken)]
    );
  }
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
}

async function revokeAllForUser(userId) {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}

module.exports = {
  COOKIE_NAME,
  signAccessToken,
  startSession,
  rotateSession,
  revokeSession,
  revokeAllForUser,
};
