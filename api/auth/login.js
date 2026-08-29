import { connectToDatabase } from '../_utils/db.js';
import { User, Session } from '../models/index.js';
import { 
  comparePassword, 
  signAccessToken, 
  generateRandomRefreshToken, 
  hashRefreshToken, 
  setRefreshTokenCookie,
  REFRESH_TOKEN_MAX_AGE_DAYS 
} from '../_utils/auth.js';
import { normalizePhone } from '../_utils/normalize.js';
import { checkRateLimit, getClientIp } from '../_utils/rateLimiter.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }

  try {
    await connectToDatabase();
    const { phone, password } = req.body || {};

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Số điện thoại và Mật khẩu' });
    }

    const cleanPhone = normalizePhone(phone);
    const clientIp = getClientIp(req);

    // 1. Rate Limiting: Tối đa 5 lần thử sai / 15 phút trên mỗi cặp IP + Phone
    const rateLimitKey = `login_${clientIp}_${cleanPhone}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: `Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(rateLimit.retryAfterSeconds / 60)} phút.`
      });
    }

    // 2. Tìm User trong Database
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Số điện thoại hoặc mật khẩu không chính xác' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ Admin.' });
    }

    // 3. Kiểm tra mật khẩu Bcrypt
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Số điện thoại hoặc mật khẩu không chính xác' });
    }

    // 4. Tạo Refresh Token ngẫu nhiên và băm bằng SHA-256 (Tốc độ ~0.01ms)
    const rawRefreshToken = generateRandomRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_MAX_AGE_DAYS);

    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';

    await Session.create({
      userId: user._id,
      tokenHash,
      deviceInfo: deviceInfo.slice(0, 150),
      ipAddress: clientIp,
      expiresAt
    });

    // 5. Cập nhật lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // 6. Ký Access Token (15 phút, lưu trong Memory Client)
    const accessToken = signAccessToken(user);

    // 7. Gắn HttpOnly Cookie cho Refresh Token
    setRefreshTokenCookie(res, rawRefreshToken);

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      accessToken,
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
    console.error('[Login API Error]', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý đăng nhập' });
  }
}
