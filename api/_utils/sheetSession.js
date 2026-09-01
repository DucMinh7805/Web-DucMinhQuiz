import jwt from 'jsonwebtoken';
import { parseCookie, stringifySetCookie } from 'cookie';
import { SECURITY_CONFIG, requireSecurityValue } from '../_config/security.js';

export const SHEET_SESSION_COOKIE = 'medquiz_sheet_session';

export function makeEntitlementKey(itemType, itemId) {
  const type = String(itemType || '').trim().toLowerCase();
  const id = String(itemId || '').trim();
  if (!id || !['subject', 'book'].includes(type)) return '';
  return `${type}:${id}`;
}

function sanitizeEntitlements(items) {
  if (!Array.isArray(items)) return [];
  const now = Date.now();
  const unique = new Map();
  items.forEach((item) => {
    const itemKey = String(item?.itemKey || makeEntitlementKey(item?.itemType || 'subject', item?.itemId)).trim();
    const expiresAt = new Date(item?.expiresAt || 0);
    if (!itemKey || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now) return;
    const current = unique.get(itemKey);
    if (!current || new Date(current.expiresAt).getTime() < expiresAt.getTime()) {
      unique.set(itemKey, { itemKey, expiresAt: expiresAt.toISOString() });
    }
  });
  return Array.from(unique.values());
}

export function createSheetSessionPayload(user) {
  const phone = String(user?.phone || '').replace(/\D/g, '');
  if (!phone) throw new Error('Không thể tạo phiên: tài khoản thiếu số điện thoại.');
  return {
    phone,
    name: String(user?.name || user?.fullName || '').trim(),
    email: String(user?.email || '').trim(),
    role: String(user?.role || 'user').trim().toLowerCase(),
    entitlements: sanitizeEntitlements(user?.entitlements)
  };
}

export function setSheetSessionCookie(res, user) {
  const secret = requireSecurityValue('SHEET_SESSION_SECRET', SECURITY_CONFIG.sessionSecret);
  const payload = createSheetSessionPayload(user);
  const maxAgeSeconds = SECURITY_CONFIG.sessionHours * 60 * 60;
  const token = jwt.sign(payload, secret, {
    expiresIn: maxAgeSeconds,
    issuer: SECURITY_CONFIG.issuer,
    audience: SECURITY_CONFIG.audience,
    subject: payload.phone
  });
  res.setHeader('Set-Cookie', stringifySetCookie({
    name: SHEET_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds
  }));
  return payload;
}

export function clearSheetSessionCookie(res) {
  res.setHeader('Set-Cookie', stringifySetCookie({
    name: SHEET_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  }));
}

export function authenticateSheetSession(req) {
  const secret = SECURITY_CONFIG.sessionSecret;
  if (!secret) return null;
  const cookies = parseCookie(req.headers.cookie || '');
  const bearer = String(req.headers.authorization || '').startsWith('Bearer ')
    ? String(req.headers.authorization).slice(7).trim()
    : '';
  const token = cookies[SHEET_SESSION_COOKIE] || bearer;
  if (!token) return null;
  try {
    return jwt.verify(token, secret, {
      issuer: SECURITY_CONFIG.issuer,
      audience: SECURITY_CONFIG.audience
    });
  } catch {
    return null;
  }
}

export function sessionHasEntitlement(session, itemType, itemId) {
  if (!session) return false;
  if (session.role === 'admin') return true;
  const expectedKey = makeEntitlementKey(itemType, itemId);
  const now = Date.now();
  return (session.entitlements || []).some((item) =>
    item?.itemKey === expectedKey && new Date(item.expiresAt).getTime() > now
  );
}
