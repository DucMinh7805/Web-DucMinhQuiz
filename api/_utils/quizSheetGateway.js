import { SECURITY_CONFIG, requireSecurityValue } from '../_config/security.js';

export async function callQuizSheet(action, params = {}, options = {}) {
  const url = requireSecurityValue('QUIZ_SHEET_WEB_APP_URL', SECURITY_CONFIG.quizSheetUrl);
  const secret = requireSecurityValue('QUIZ_SYNC_INTERNAL_SECRET', SECURITY_CONFIG.quizSyncInternalSecret);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 25000);
  const body = new URLSearchParams({ action, internalSecret: secret, ...params });
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
      redirect: 'follow',
      signal: controller.signal
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Google Apps Script không trả JSON hợp lệ.'); }
    if (!response.ok || data?.error || data?.success === false) {
      throw new Error(data?.error || data?.message || 'Google Apps Script từ chối cập nhật.');
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}
