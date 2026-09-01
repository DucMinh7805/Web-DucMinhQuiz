import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { parseCookie, stringifySetCookie } from 'cookie';

function getJwtSecret() {
  const value = process.env.JWT_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Thiếu biến môi trường JWT_SECRET trên production.');
  }
  return 'dev_only_jwt_secret_never_use_in_production';
}
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 phút
export const REFRESH_TOKEN_COOKIE_NAME = 'medquiz_refresh_token';
export const REFRESH_TOKEN_MAX_AGE_DAYS = 30;

/**
 * 1. Password Hashing (Bcrypt - chủ đích an toàn chống brute-force)
 */
export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

export async function comparePassword(plainPassword, hash) {
  if (!plainPassword || !hash) return false;
  return bcrypt.compare(plainPassword, hash);
}

/**
 * 2. Access Token (JWT - 15 phút, lưu trong RAM/Memory Client)
 */
export function signAccessToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId || payload._id,
      phone: payload.phone,
      role: payload.role || 'user',
      subscriptionTier: payload.subscriptionTier || 'free'
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

/**
 * 3. Refresh Token Generation & SHA-256 Hashing (Tốc độ ~0.01ms chống nghẽn CPU)
 */
export function generateRandomRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashRefreshToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return '';
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * 4. CSRF Token Helpers
 */
export function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function verifyCsrfHeader(req) {
  // Chỉ kiểm tra trên các request thay đổi dữ liệu có dùng Cookie (/refresh, /login, /logout)
  const csrfHeader = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  if (!csrfHeader || typeof csrfHeader !== 'string' || csrfHeader.length < 16) {
    return false;
  }
  return true;
}

/**
 * 5. HttpOnly Cookie Helpers
 */
export function setRefreshTokenCookie(res, rawRefreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSerialized = stringifySetCookie({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: rawRefreshToken,
    httpOnly: true,
    secure: isProduction, // Yêu cầu HTTPS trên production
    sameSite: isProduction ? 'lax' : 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE_DAYS * 24 * 60 * 60 // 30 ngày tính bằng giây
  });

  res.setHeader('Set-Cookie', cookieSerialized);
}

export function clearRefreshTokenCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSerialized = stringifySetCookie({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'lax' : 'lax',
    path: '/',
    maxAge: 0 // Xoá cookie ngay lập tức
  });

  res.setHeader('Set-Cookie', cookieSerialized);
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return parseCookie(header);
}

/**
 * Middleware trích xuất User từ Access Token Header
 */
export function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyAccessToken(token);
}
