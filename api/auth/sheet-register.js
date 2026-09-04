import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '../_utils/rateLimiter.js';
import { normalizePhone, isValidVietnamesePhone } from '../_utils/normalize.js';
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
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim();
  if (!isValidVietnamesePhone(phone) || password.length < 6 || !name) {
    return res.status(400).json({ success: false, message: 'Thông tin đăng ký chưa hợp lệ.' });
  }

  // Cho phép tối đa 20 lượt đăng ký/giờ từ cùng một IP (phòng ký túc xá / thư viện Wi-Fi chung)
  // và tối đa 3 lần/15 phút trên từng Số Điện Thoại cụ thể để chống spam
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`sheet_register_ip_${ip}`, 20, 60 * 60 * 1000);
  const phoneLimit = checkRateLimit(`sheet_register_phone_${phone}`, 3, 15 * 60 * 1000);
  if (!ipLimit.allowed || !phoneLimit.allowed) {
    return res.status(429).json({ success: false, message: 'Đăng ký quá nhiều lần. Vui lòng thử lại sau ít phút.' });
  }

  try {
    // 1. Chỉ gọi GAS 1 lần duy nhất để tạo dòng mới và gửi email xác nhận trong background
    const registered = await callAuthSheet('register', { phone, password, name, email }, { internal: true, timeoutMs: 25000 });
    if (!registered?.success) {
      return res.status(400).json({ success: false, message: registered?.error || 'Không thể đăng ký.' });
    }

    const displayName = registered.user?.name || name || `Học viên ${phone.slice(-4)}`;
    const userEmail = registered.user?.email || email;

    const userPayload = {
      phone,
      name: displayName,
      email: userEmail,
      role: 'user',
      entitlements: []
    };

    // 2. Tự động lưu cache người dùng vào MongoDB Atlas để đăng nhập siêu tốc (15ms)
    try {
      await connectToDatabase();
      await User.updateOne(
        { phone },
        {
          $set: {
            fullName: displayName,
            passwordHash: computeFastHash(phone, password),
            role: 'user',
            entitlements: [],
            isActive: true,
            createdAt: new Date(),
            lastLoginAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (cacheErr) {
      console.warn('[Register DB Cache]', cacheErr.message);
    }

    // 3. Đặt HttpOnly session cookie và đăng nhập ngay lập tức cho người dùng
    const user = setSheetSessionCookie(res, userPayload);
    return res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('[Sheet Register]', error);
    return res.status(502).json({ success: false, message: 'Máy chủ đăng ký tạm thời không phản hồi. Vui lòng thử lại sau vài giây.' });
  }
}
