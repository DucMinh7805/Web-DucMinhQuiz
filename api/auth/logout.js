import { connectToDatabase } from '../_utils/db.js';
import { Session } from '../_models/index.js';
import { 
  hashRefreshToken, 
  clearRefreshTokenCookie, 
  parseCookies, 
  verifyCsrfHeader, 
  authenticateUser,
  REFRESH_TOKEN_COOKIE_NAME 
} from '../_utils/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }

  // 1. Kiểm tra CSRF header
  if (!verifyCsrfHeader(req)) {
    return res.status(403).json({ success: false, message: 'Thiếu hoặc sai định dạng CSRF Token header' });
  }

  try {
    await connectToDatabase();

    const { allDevices } = req.body || {};
    const cookies = parseCookies(req);
    const rawRefreshToken = cookies[REFRESH_TOKEN_COOKIE_NAME];
    const authenticated = authenticateUser(req);

    if (allDevices) {
      // Đăng xuất khỏi TOÀN BỘ thiết bị
      let targetUserId = authenticated?.userId;

      if (!targetUserId && rawRefreshToken) {
        const tokenHash = hashRefreshToken(rawRefreshToken);
        const currentSession = await Session.findOne({ tokenHash });
        if (currentSession) targetUserId = currentSession.userId;
      }

      if (targetUserId) {
        await Session.deleteMany({ userId: targetUserId });
      }
    } else if (rawRefreshToken) {
      // Đăng xuất thiết bị hiện tại
      const tokenHash = hashRefreshToken(rawRefreshToken);
      await Session.findOneAndDelete({ tokenHash });
    }

    // Xoá cookie
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: allDevices ? 'Đã đăng xuất khỏi tất cả thiết bị thành công!' : 'Đăng xuất thành công!'
    });
  } catch (error) {
    console.error('[Logout API Error]', error);
    clearRefreshTokenCookie(res);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng xuất' });
  }
}
