import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

function legacyPasswordHash(phone, password) {
  const secret = String(process.env.SHEET_SESSION_SECRET || '');
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(`${phone}:${password}`).digest('hex');
}

export function isLegacyPasswordHash(hash) {
  return /^[a-f0-9]{64}$/i.test(String(hash || ''));
}

export async function hashPassword(password) {
  return bcrypt.hash(String(password || ''), BCRYPT_ROUNDS);
}

export async function verifyPassword(phone, password, storedHash) {
  const hash = String(storedHash || '');
  if (!hash) return false;
  if (!isLegacyPasswordHash(hash)) return bcrypt.compare(String(password || ''), hash);

  const expected = Buffer.from(legacyPasswordHash(phone, password), 'hex');
  const actual = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
