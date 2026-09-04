import { checkRateLimit, getClientIp } from '../_utils/rateLimiter.js';
import { callAuthSheet } from '../_utils/sheetGateway.js';
import { authenticateSheetSession, setSheetSessionCookie } from '../_utils/sheetSession.js';

/**
 * Làm mới quyền sau khi admin cấp trực tiếp trên Web quản trị PRO.
 * Không nhận SĐT từ trình duyệt: luôn dùng SĐT trong cookie đã ký.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  }

  const session = authenticateSheetSession(req);
  if (!session?.phone) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }

  const limit = checkRateLimit(`refresh_access_${getClientIp(req)}_${session.phone}`, 12, 10 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({ success: false, message: 'Bạn kiểm tra quá nhiều lần. Vui lòng chờ ít phút.' });
  }

  try {
    const data = await callAuthSheet('sessionprofile', { phone: session.phone }, { internal: true });
    if (!data?.success || !data?.user) {
      return res.status(403).json({ success: false, message: data?.error || 'Không thể làm mới quyền tài khoản.' });
    }
    const user = setSheetSessionCookie(res, data.user);
    try {
      const { connectToDatabase } = await import('../_utils/db.js');
      const { User } = await import('../_models/index.js');
      await connectToDatabase();
      await User.updateOne(
        { phone: session.phone },
        { $set: { entitlements: Array.isArray(data.user.entitlements) ? data.user.entitlements : [] } }
      );
    } catch (dbErr) {
      console.warn('[Refresh Access DB Cache]', dbErr.message);
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('[Refresh Access]', error);
    return res.status(502).json({ success: false, message: 'Máy chủ quyền truy cập tạm thời không phản hồi.' });
  }
}
