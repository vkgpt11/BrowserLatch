const encoder = new TextEncoder();
const ITERATIONS = 210000;

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS}, key, 256);
  return new Uint8Array(bits);
}

export async function createPasswordRecord(password) {
  validatePassword(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return {version: 1, iterations: ITERATIONS, salt: bytesToBase64(salt), hash: bytesToBase64(hash)};
}

export async function verifyPassword(password, record) {
  if (!record || record.version !== 1 || record.iterations !== ITERATIONS || typeof password !== 'string') return false;
  let expected;
  try { expected = base64ToBytes(record.hash); }
  catch { return false; }
  const actual = await derive(password, base64ToBytes(record.salt));
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) throw new Error('Use at least 8 characters.');
  if (password.length > 128) throw new Error('Password must be 128 characters or fewer.');
}
