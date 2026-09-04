import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '../_utils/rateLimiter.js';
import { normalizePhone } from '../_utils/normalize.js';
import { callAuthSheet } from '../_utils/sheetGateway.js';
import { setSheetSessionCookie } from '../_utils/sheetSession.js';
import { connectToDatabase } from '../_utils/db.js';
import { User } from '../_models/index.js';

function computeFastHash(phone, password) {
  const secret = process.env.SHEET_SESSION_SECRET || 'medquiz_secure_pepper_2026';
  return crypto.createHmac('sha256', secret).update(`${phone}:${password}`).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || '');
  if (!phone || !password) return res.status(400).json({ success: false, message: 'Thiếu số điện thoại hoặc mật khẩu.' });
  const limit = checkRateLimit(`sheet_login_${getClientIp(req)}_${phone}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) return res.status(429).json({ success: false, message: 'Thử sai quá nhiều lần. Vui lòng chờ 15 phút.' });

  // 1. Kiểm tra cache đăng nhập siêu tốc qua MongoDB Atlas (15 miligiây)
  try {
    await connectToDatabase();
    const cachedUser = await User.findOne({ phone, isActive: true }).lean();
    if (cachedUser && cachedUser.passwordHash === computeFastHash(phone, password)) {
      const userPayload = {
        phone: cachedUser.phone,
        name: cachedUser.fullName,
        role: cachedUser.role || 'user',
        subscriptionTier: cachedUser.subscriptionTier || 'free',
        subscriptionExpiresAt: cachedUser.subscriptionExpiresAt,
        entitlements: Array.isArray(cachedUser.entitlements) ? cachedUser.entitlements : []
      };
      const user = setSheetSessionCookie(res, userPayload);
      User.updateOne({ _id: cachedUser._id }, { $set: { lastLoginAt: new Date() } }).exec().catch(() => {});
      return res.status(200).json({ success: true, user });
    }
  } catch (dbErr) {
    console.warn('[Fast Login DB Check]', dbErr.message);
  }

  // 2. Nếu chưa có trong cache hoặc mật khẩu mới -> Xác thực qua Google Apps Script
  try {
    const data = await callAuthSheet('login', { phone, password }, { internal: true, timeoutMs: 25000 });
    if (!data?.success || !data?.user) {
      return res.status(401).json({ success: false, message: data?.error || 'Thông tin đăng nhập không đúng.' });
    }
    const user = setSheetSessionCookie(res, data.user);

    // 3. Tự động lưu/cập nhật cache vào MongoDB cho các lần đăng nhập sau siêu tốc
    try {
      await connectToDatabase();
      await User.updateOne(
        { phone },
        {
          $set: {
            fullName: data.user.name || data.user.fullName || phone,
            passwordHash: computeFastHash(phone, password),
            role: data.user.role || 'user',
            entitlements: Array.isArray(data.user.entitlements) ? data.user.entitlements : [],
            isActive: true,
            lastLoginAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (cacheErr) {
      console.warn('[Fast Login Cache Save]', cacheErr.message);
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('[Sheet Login]', error);
    return res.status(502).json({ success: false, message: 'Máy chủ xác thực tạm thời không phản hồi. Vui lòng thử lại sau vài giây.' });
  }
}
