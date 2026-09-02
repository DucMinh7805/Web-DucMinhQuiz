import { checkRateLimit, getClientIp } from '../_utils/rateLimiter.js';
import { normalizePhone } from '../_utils/normalize.js';
import { callAuthSheet } from '../_utils/sheetGateway.js';
import { authenticateSheetSession, setSheetSessionCookie } from '../_utils/sheetSession.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  }

  const session = authenticateSheetSession(req);
  if (!session?.phone) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }

  const name = String(req.body?.name || '').trim().replace(/\s+/g, ' ');
  const phone = normalizePhone(req.body?.phone);
  const email = String(req.body?.email || '').trim().toLowerCase();
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ success: false, message: 'Họ và tên phải có từ 2 đến 80 ký tự.' });
  }
  if (!/^0\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.' });
  }
  if (email && (email.length > 120 || !EMAIL_PATTERN.test(email))) {
    return res.status(400).json({ success: false, message: 'Địa chỉ Gmail/email không hợp lệ.' });
  }
  if (!currentPassword) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại để xác nhận.' });
  }
  if (newPassword && (newPassword.length < 6 || newPassword.length > 128)) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có từ 6 đến 128 ký tự.' });
  }

  const limit = checkRateLimit(`profile_update_${getClientIp(req)}_${session.phone}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({ success: false, message: 'Bạn cập nhật quá nhiều lần. Vui lòng chờ 15 phút.' });
  }

  try {
    const data = await callAuthSheet('updateprofile', {
      originalPhone: session.phone,
      name,
      phone,
      email,
      currentPassword,
      newPassword
    }, { internal: true });
    if (!data?.success || !data?.user) {
      return res.status(400).json({ success: false, message: data?.error || 'Không thể cập nhật hồ sơ.' });
    }
    const user = setSheetSessionCookie(res, data.user);
    return res.status(200).json({ success: true, user, message: 'Đã đồng bộ hồ sơ với hệ thống.' });
  } catch (error) {
    console.error('[Profile Update]', error);
    return res.status(502).json({ success: false, message: 'Máy chủ tài khoản tạm thời không phản hồi.' });
  }
}
