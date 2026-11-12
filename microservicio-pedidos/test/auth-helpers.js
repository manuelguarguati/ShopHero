const TEST_SECRET = Buffer.from('shophero-test-secret-with-32-bytes-minimum');

async function issueToken(scopes, {
  expiresAt,
  issuer = 'shophero-local',
  audience = 'shophero-api',
  subject = 'usuario_1',
  roles = [],
} = {}) {
  const { SignJWT } = await import('jose');
  const now = Math.floor(Date.now() / 1000);
  let token = new SignJWT({ scope: scopes.join(' '), roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt(now);
  token = expiresAt === undefined ? token.setExpirationTime('5m') : token.setExpirationTime(expiresAt);
  return token.sign(TEST_SECRET);
}

module.exports = { issueToken, TEST_SECRET };
