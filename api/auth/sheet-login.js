import { checkRateLimit, getClientIp } from '../_utils/rateLimiter.js';
import { normalizePhone } from '../_utils/normalize.js';
import { callAuthSheet } from '../_utils/sheetGateway.js';
import { setSheetSessionCookie } from '../_utils/sheetSession.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || '');
  if (!phone || !password) return res.status(400).json({ success: false, message: 'Thiếu số điện thoại hoặc mật khẩu.' });
  const limit = checkRateLimit(`sheet_login_${getClientIp(req)}_${phone}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) return res.status(429).json({ success: false, message: 'Thử sai quá nhiều lần. Vui lòng chờ 15 phút.' });
  try {
    const data = await callAuthSheet('login', { phone, password }, { internal: true });
    if (!data?.success || !data?.user) {
      return res.status(401).json({ success: false, message: data?.error || 'Thông tin đăng nhập không đúng.' });
    }
    const user = setSheetSessionCookie(res, data.user);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('[Sheet Login]', error);
    return res.status(502).json({ success: false, message: 'Máy chủ xác thực tạm thời không phản hồi.' });
  }
}
