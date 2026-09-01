import assert from 'node:assert/strict';

process.env.SHEET_SESSION_SECRET = 'test_only_secret_with_more_than_32_characters_123';
process.env.NODE_ENV = 'test';

const {
  authenticateSheetSession,
  makeEntitlementKey,
  sessionHasEntitlement,
  setSheetSessionCookie
} = await import('../api/_utils/sheetSession.js');

assert.equal(makeEntitlementKey('subject', 'LY_SINH'), 'subject:LY_SINH');
assert.equal(makeEntitlementKey('book', 'SINH_LY_2025'), 'book:SINH_LY_2025');
assert.equal(makeEntitlementKey('unknown', 'X'), '');

let setCookie = '';
const response = { setHeader(name, value) { if (name === 'Set-Cookie') setCookie = value; } };
setSheetSessionCookie(response, {
  phone: '0796989703',
  name: 'Test User',
  role: 'user',
  entitlements: [
    { itemKey: 'subject:LY_SINH', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    { itemKey: 'book:SINH_LY_2025', expiresAt: new Date(Date.now() - 86400000).toISOString() }
  ]
});

assert.ok(setCookie.includes('HttpOnly'));
const request = { headers: { cookie: setCookie.split(';')[0] } };
const session = authenticateSheetSession(request);
assert.equal(session.phone, '0796989703');
assert.equal(sessionHasEntitlement(session, 'subject', 'LY_SINH'), true);
assert.equal(sessionHasEntitlement(session, 'subject', 'ly_sinh'), false, 'ID comparison must be exact');
assert.equal(sessionHasEntitlement(session, 'book', 'SINH_LY_2025'), false, 'Expired grants must be removed');
assert.equal(sessionHasEntitlement(session, 'book', 'LY_SINH'), false, 'Book and subject namespaces must not collide');

const tamperedRequest = { headers: { cookie: request.headers.cookie.replace(/.$/, 'x') } };
assert.equal(authenticateSheetSession(tamperedRequest), null, 'Tampered session must be rejected');

console.log('Security session tests passed.');
