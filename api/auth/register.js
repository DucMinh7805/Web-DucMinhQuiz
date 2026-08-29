import { connectToDatabase } from '../_utils/db.js';
import { User } from '../models/index.js';
import { hashPassword } from '../_utils/auth.js';
import { normalizePhone, isValidVietnamesePhone } from '../_utils/normalize.js';
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

  // 1. Rate Limiting: Tối đa 3 lần đăng ký / 1 giờ trên mỗi IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`reg_${clientIp}`, 3, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: `Bạn đã thử tạo tài khoản quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(rateLimit.retryAfterSeconds / 60)} phút.`
    });
  }

  try {
    await connectToDatabase();
    const { phone, password, fullName } = req.body || {};

    if (!phone || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ Họ tên, Số điện thoại và Mật khẩu' });
    }

    // 2. Chuẩn hóa & kiểm tra SĐT
    const cleanPhone = normalizePhone(phone);
    if (!isValidVietnamesePhone(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (cần đúng 10 chữ số đầu số Việt Nam)' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có độ dài tối thiểu từ 6 ký tự' });
    }

    // 3. Kiểm tra trùng SĐT thân thiện (không để lộ lỗi kỹ thuật E11000)
    const existingUser = await User.findOne({ phone: cleanPhone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã được đăng ký tài khoản! Vui lòng đăng nhập hoặc liên hệ hỗ trợ.'
      });
    }

    // 4. Băm mật khẩu bằng Bcrypt
    const passwordHash = await hashPassword(password);

    const newUser = new User({
      phone: cleanPhone,
      fullName: fullName.trim(),
      passwordHash,
      role: 'user',
      subscriptionTier: 'free'
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.',
      user: {
        id: newUser._id,
        phone: newUser.phone,
        fullName: newUser.fullName,
        role: newUser.role,
        subscriptionTier: newUser.subscriptionTier
      }
    });
  } catch (error) {
    console.error('[Register API Error]', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã được đăng ký tài khoản!'
      });
    }
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng ký tài khoản' });
  }
}
