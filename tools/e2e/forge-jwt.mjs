// node forge-jwt.mjs none|unknown-key|expired|wrong-issuer|wrong-audience  -> prints a (deliberately invalid) JWT
import { createHmac } from 'node:crypto';
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const kind = process.argv[2] ?? 'unknown-key';
const now = Math.floor(Date.now() / 1000);
const claims = { sub: 'forged', iss: kind === 'wrong-issuer' ? 'https://evil.example' : 'https://mc-api.europe-west1.gcp.commercetools.com',
  aud: kind === 'wrong-audience' ? 'https://not-this-service.example' : 'https://service.example', iat: now - 7200, exp: kind === 'expired' ? now - 3600 : now + 3600 };
if (kind === 'none') { console.log(`${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`); }
else { const h = b64({ alg: 'HS256', typ: 'JWT', kid: 'forged-kid' }); const p = b64(claims);
  console.log(`${h}.${p}.${createHmac('sha256', 'not-a-real-secret').update(`${h}.${p}`).digest('base64url')}`); }
