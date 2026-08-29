import { connectToDatabase } from '../_utils/db.js';
import { User, Session } from '../_models/index.js';
import { 
  signAccessToken, 
  generateRandomRefreshToken, 
  hashRefreshToken, 
  setRefreshTokenCookie, 
  clearRefreshTokenCookie, 
  parseCookies, 
  verifyCsrfHeader,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_MAX_AGE_DAYS
} from '../_utils/auth.js';
import { getClientIp } from '../_utils/rateLimiter.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }

  // 1. Kiểm tra CSRF Token Header (Bắt buộc cho endpoint dùng Cookie)
  if (!verifyCsrfHeader(req)) {
    return res.status(403).json({
      success: false,
      message: 'Từ chối truy cập: Thiếu hoặc sai định dạng CSRF Token header'
    });
  }

  try {
    await connectToDatabase();

    // 2. Đọc rawRefreshToken từ HttpOnly Cookie
    const cookies = parseCookies(req);
    const rawRefreshToken = cookies[REFRESH_TOKEN_COOKIE_NAME];

    if (!rawRefreshToken) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ success: false, message: 'Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.' });
    }

    // 3. Hash SHA-256 của Refresh Token
    const tokenHash = hashRefreshToken(rawRefreshToken);

    // 4. THAO TÁC NGUYÊN TỬ (Atomic Operation): findOneAndDelete
    // Tránh race-condition khi kẻ trộm và user thật cùng gọi refresh đồng thời
    const deletedSession = await Session.findOneAndDelete({ tokenHash });

    if (!deletedSession) {
      // REUSE DETECTED (Phát hiện tái sử dụng Token cũ đã bị xoá trước đó)
      console.warn(`[Security Alert] Phát hiện Refresh Token cũ bị tái sử dụng! IP: ${getClientIp(req)}`);
      
      // Xoá cookie trên client
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        success: false,
        isCompromised: true,
        message: 'Phiên làm việc đã hết hạn hoặc bị nghi ngờ xâm phạm. Vui lòng đăng nhập lại.'
      });
    }

    // 5. Tìm User và kiểm tra tính hợp lệ
    const user = await User.findById(deletedSession.userId);
    if (!user || !user.isActive) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa.' });
    }

    // 6. XOAY VÒNG TOKEN (Token Rotation): Phát hành Refresh Token mới
    const newRawRefreshToken = generateRandomRefreshToken();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_MAX_AGE_DAYS);

    const deviceInfo = req.headers['user-agent'] || deletedSession.deviceInfo || 'Unknown Device';
    const clientIp = getClientIp(req);

    await Session.create({
      userId: user._id,
      tokenHash: newTokenHash,
      deviceInfo: deviceInfo.slice(0, 150),
      ipAddress: clientIp,
      expiresAt
    });

    // 7. Cấp Access Token mới (15 phút)
    const newAccessToken = signAccessToken(user);

    // 8. Cập nhật HttpOnly Cookie mới
    setRefreshTokenCookie(res, newRawRefreshToken);

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt
      }
    });
  } catch (error) {
    console.error('[Refresh API Error]', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gia hạn phiên làm việc' });
  }
}
