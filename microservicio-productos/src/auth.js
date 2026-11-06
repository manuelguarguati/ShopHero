const fs = require('node:fs');
const jose = import('jose');
const ISSUER = process.env.JWT_ISSUER || 'shophero-local';
const AUDIENCE = process.env.JWT_AUDIENCE || 'shophero-api';

function createJwtAuth(secret = loadJwtSecret()) {
  return async function authenticate(req, res, next) {
    if (req.path === '/health' || req.path === '/metrics') return next();

    const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
    if (!match) {
      return res.status(401).json({ error: 'Se requiere un token Bearer válido' });
    }

    try {
      const { jwtVerify } = await jose;
      const { payload } = await jwtVerify(match[1], secret, {
        algorithms: ['HS256'],
        audience: AUDIENCE,
        issuer: ISSUER,
        requiredClaims: ['exp', 'iat', 'sub'],
        clockTolerance: 5,
      });
      req.auth = {
        subject: payload.sub,
        scopes: typeof payload.scope === 'string' ? payload.scope.split(/\s+/).filter(Boolean) : [],
        roles: Array.isArray(payload.roles) ? payload.roles : [],
      };
      return next();
    } catch (error) {
      if (error.code && /^(ERR_JWT_|ERR_JWS_|ERR_JOSE_)/.test(error.code)) {
        req.log.warn({ reason: error.code }, 'JWT rechazado');
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }
      return next(error);
    }
  };
}

function requireScopes(...requiredScopes) {
  return (req, res, next) => {
    if (req.auth.roles.includes('admin') || requiredScopes.every((scope) => req.auth.scopes.includes(scope))) {
      return next();
    }
    return res.status(403).json({ error: 'Permisos insuficientes' });
  };
}

function loadJwtSecret() {
  let secret;
  if (process.env.JWT_SECRET_PATH) {
    secret = Buffer.from(fs.readFileSync(process.env.JWT_SECRET_PATH, 'utf8').trim(), 'base64');
  } else if (process.env.JWT_SECRET) {
    secret = Buffer.from(process.env.JWT_SECRET, 'base64');
  } else {
    throw new Error('JWT_SECRET_PATH o JWT_SECRET debe configurarse');
  }

  if (secret.length < 32) {
    throw new Error('El secreto JWT debe contener al menos 32 bytes');
  }
  return secret;
}

module.exports = { createJwtAuth, loadJwtSecret, requireScopes };
