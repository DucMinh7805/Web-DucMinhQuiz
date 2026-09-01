import { checkRateLimit, getClientIp } from '../_utils/rateLimiter.js';
import { normalizePhone, isValidVietnamesePhone } from '../_utils/normalize.js';
import { callAuthSheet } from '../_utils/sheetGateway.js';
import { setSheetSessionCookie } from '../_utils/sheetSession.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || '');
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim();
  if (!isValidVietnamesePhone(phone) || password.length < 6 || !name) {
    return res.status(400).json({ success: false, message: 'Thông tin đăng ký chưa hợp lệ.' });
  }
  const limit = checkRateLimit(`sheet_register_${getClientIp(req)}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) return res.status(429).json({ success: false, message: 'Đăng ký quá nhiều lần. Vui lòng thử lại sau.' });
  try {
    const registered = await callAuthSheet('register', { phone, password, name, email }, { internal: true });
    if (!registered?.success) {
      return res.status(400).json({ success: false, message: registered?.error || 'Không thể đăng ký.' });
    }
    const loggedIn = await callAuthSheet('login', { phone, password }, { internal: true });
    if (!loggedIn?.success || !loggedIn?.user) return res.status(201).json({ success: true, requiresLogin: true });
    const user = setSheetSessionCookie(res, loggedIn.user);
    return res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('[Sheet Register]', error);
    return res.status(502).json({ success: false, message: 'Máy chủ đăng ký tạm thời không phản hồi.' });
  }
}
