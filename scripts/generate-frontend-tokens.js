const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const secretPath = path.join(__dirname, '..', '.dev-secrets', 'jwt-secret');
  if (!fs.existsSync(secretPath)) {
    console.warn('Advertencia: No se encontró .dev-secrets/jwt-secret. Los tokens del frontend se generarán tras ejecutar bootstrap-dev.ps1');
    return;
  }
  const secret = Buffer.from(fs.readFileSync(secretPath, 'utf8').trim(), 'base64');

  const serviceRequire = createRequire(path.join(__dirname, '..', 'microservicio-carrito', 'package.json'));
  const { SignJWT } = await import(pathToFileURL(serviceRequire.resolve('jose')).href);

  const issuer = process.env.JWT_ISSUER || 'shophero-local';
  const audience = process.env.JWT_AUDIENCE || 'shophero-api';

  async function createToken(sub, scopes, roles = []) {
    return new SignJWT({ scope: scopes.join(' '), roles })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
  }

  const tokens = {
    usuario_1: await createToken('usuario_1', ['products:read', 'cart:read', 'cart:write']),
    usuario_2: await createToken('usuario_2', ['cart:read', 'cart:write']),
    admin: await createToken('admin', ['products:read', 'products:write', 'cart:read', 'cart:write'], ['admin']),
    generatedAt: new Date().toISOString(),
  };

  const frontendDir = path.join(__dirname, '..', 'frontend');
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const outputPath = path.join(frontendDir, 'dev-tokens.json');
  fs.writeFileSync(outputPath, JSON.stringify(tokens, null, 2), 'utf8');
  console.log(`Tokens de desarrollo guardados exitosamente en ${outputPath}`);
}

main().catch((err) => {
  console.error('Error generando tokens para el frontend:', err.message);
});
