const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const allowedScopes = new Set(['cart:read', 'cart:write', 'products:read', 'products:write']);

async function generateDevToken(subject, scopes, expiresIn = '15m') {
  if (!subject || !/^[a-zA-Z0-9_-]{1,100}$/.test(subject) || !scopes || scopes.length === 0) {
    throw new Error('Uso: node scripts/create-dev-token.js <usuario> <scope> [scope ...]');
  }
  if (scopes.some((scope) => !allowedScopes.has(scope))) {
    throw new Error(`Scopes permitidos: ${[...allowedScopes].join(', ')}`);
  }

  const secretPath = path.join(__dirname, '..', '.dev-secrets', 'jwt-secret');
  if (!fs.existsSync(secretPath)) {
    throw new Error('No se encontró el secreto en .dev-secrets/jwt-secret. Inicia el stack con bootstrap-dev.ps1 primero.');
  }
  const secret = Buffer.from(fs.readFileSync(secretPath, 'utf8').trim(), 'base64');
  if (secret.length < 32) {
    throw new Error('El secreto JWT local no tiene la longitud requerida.');
  }

  const serviceRequire = createRequire(path.join(__dirname, '..', 'microservicio-carrito', 'package.json'));
  const { SignJWT } = await import(pathToFileURL(serviceRequire.resolve('jose')).href);
  return new SignJWT({ scope: [...new Set(scopes)].join(' ') })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(process.env.JWT_ISSUER || 'shophero-local')
    .setAudience(process.env.JWT_AUDIENCE || 'shophero-api')
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

async function main() {
  const [subject, ...scopes] = process.argv.slice(2);
  const token = await generateDevToken(subject, scopes);
  process.stdout.write(`${token}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { generateDevToken };
