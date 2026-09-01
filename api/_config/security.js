/**
 * Cấu hình bảo mật tập trung cho luồng tài khoản Google Sheet.
 *
 * Biến môi trường bắt buộc trên hosting:
 * - AUTH_SHEET_WEB_APP_URL: URL deployment của GAS_User_Auth.gs.
 * - SHEET_SESSION_SECRET: chuỗi ngẫu nhiên >= 32 ký tự dùng ký phiên đăng nhập.
 * - AUTH_SHEET_INTERNAL_SECRET: bí mật chung giữa API và Script Property của GAS.
 */
export const SECURITY_CONFIG = Object.freeze({
  authSheetUrl: process.env.AUTH_SHEET_WEB_APP_URL || '',
  sessionSecret: process.env.SHEET_SESSION_SECRET || '',
  authSheetInternalSecret: process.env.AUTH_SHEET_INTERNAL_SECRET || '',
  // Giữ nhanh vì quyền nằm trong cookie, nhưng giới hạn cửa sổ thu hồi quyền.
  sessionHours: 4,
  issuer: 'medquiz-api',
  audience: 'medquiz-web'
});

export function requireSecurityValue(name, value) {
  if (!value || String(value).trim().length < 1) {
    throw new Error(`Thiếu biến môi trường bảo mật: ${name}`);
  }
  return String(value).trim();
}
