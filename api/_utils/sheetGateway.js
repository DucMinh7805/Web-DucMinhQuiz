import { SECURITY_CONFIG, requireSecurityValue } from '../_config/security.js';

/** Gọi Google Apps Script từ máy chủ; trình duyệt không nhận URL nội bộ/bí mật. */
export async function callAuthSheet(action, params = {}, options = {}) {
  const url = requireSecurityValue('AUTH_SHEET_WEB_APP_URL', SECURITY_CONFIG.authSheetUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 25000);
  const body = new URLSearchParams({ action, ...params });
  if (options.internal) {
    body.set('internalSecret', requireSecurityValue(
      'AUTH_SHEET_INTERNAL_SECRET',
      SECURITY_CONFIG.authSheetInternalSecret
    ));
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
      redirect: 'follow',
      signal: controller.signal
    });
    const text = await response.text();
    if (!text.trim()) {
      throw new Error('Google Apps Script trả phản hồi rỗng. Hãy deploy New version và kiểm tra quyền Web app.');
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Google Apps Script không trả về JSON hợp lệ.');
    }
    if (!response.ok) throw new Error(data?.error || 'Google Apps Script từ chối yêu cầu.');
    return data;
  } finally {
    clearTimeout(timeout);
  }
}
