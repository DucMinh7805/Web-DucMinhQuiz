import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '../_utils/rateLimiter.js';
import { normalizePhone, isValidVietnamesePhone } from '../_utils/normalize.js';
import { callAuthSheet } from '../_utils/sheetGateway.js';
import { setSheetSessionCookie } from '../_utils/sheetSession.js';
import { connectToDatabase } from '../_utils/db.js';
import { scheduleBackgroundTask } from '../_utils/backgroundTask.js';
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
    // 1. Kiểm tra tài khoản đã tồn tại trong nguồn chính MongoDB Atlas.
    await connectToDatabase();
    const existing = await User.findOne({ phone }).lean();
    if (existing) {
      return res.status(400).json({ success: false, message: 'Số Điện Thoại này đã được đăng ký tài khoản!' });
    }

    const displayName = name || `Học viên ${phone.slice(-4)}`;
    const passwordHash = computeFastHash(phone, password);
    const userPayload = {
      phone,
      name: displayName,
      email,
      role: 'user',
      entitlements: []
    };

    // 2. Lưu ngay tài khoản vào MongoDB Atlas.
    await User.create({
      phone,
      fullName: displayName,
      passwordHash,
      role: 'user',
      entitlements: [],
      isActive: true,
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    // 3. Đặt HttpOnly session cookie và đăng nhập ngay cho người dùng.
    const user = setSheetSessionCookie(res, userPayload);

    // 4. Sheet tài khoản là nguồn quản trị riêng, không nằm trên đường phản hồi
    // đăng ký. waitUntil giữ tác vụ sống sau khi HTTP response đã được gửi.
    scheduleBackgroundTask(async () => {
      const synced = await callAuthSheet(
        'register',
        { phone, password, name: displayName, email },
        { internal: true, timeoutMs: 30000 }
      );
      if (!synced?.success) {
        throw new Error(synced?.error || 'Sheet tài khoản từ chối đồng bộ.');
      }
    }, 'Auth Sheet registration sync');

    return res.status(201).json({ success: true, user });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: 'Số Điện Thoại này đã được đăng ký tài khoản!' });
    }
    console.error('[Instant Register]', error);
    return res.status(500).json({ success: false, message: 'Không thể tạo tài khoản lúc này. Vui lòng thử lại.' });
  }
}
