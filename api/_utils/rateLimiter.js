/**
 * In-memory sliding window Rate Limiter.
 * Đây là lớp bảo vệ best-effort trong từng instance, không phải giới hạn toàn
 * hệ thống khi Vercel scale ngang. Production lớn cần Redis/WAF dùng chung.
 */
const rateLimitMap = new Map();
const MAX_TRACKED_KEYS = 20000;

const GLOBAL_API_POLICIES = Object.freeze({
  publicRead: { id: 'public-read', maxRequests: 3000, windowMs: 60 * 1000 },
  auth: { id: 'auth', maxRequests: 600, windowMs: 60 * 1000 },
  write: { id: 'write', maxRequests: 600, windowMs: 60 * 1000 },
  adminSync: { id: 'admin-sync', maxRequests: 300, windowMs: 5 * 60 * 1000 },
  fallback: { id: 'fallback', maxRequests: 1200, windowMs: 60 * 1000 }
});

// Tự động dọn dẹp các IP quá hạn mỗi 10 phút
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000);
// Không giữ Node/Vercel Function sống chỉ vì bộ dọn cache nội bộ.
cleanupTimer.unref?.();

export function checkRateLimit(key, maxRequests = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetAt <= now) {
    if (rateLimitMap.size >= MAX_TRACKED_KEYS) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey !== undefined) rateLimitMap.delete(oldestKey);
    }
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetAt: record.resetAt, 
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000) 
    };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}

export function getClientIp(req) {
  const forwardedFor = Array.isArray(req.headers['x-forwarded-for'])
    ? req.headers['x-forwarded-for'][0]
    : req.headers['x-forwarded-for'];
  return (
    forwardedFor?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

function getGlobalApiPolicy(req) {
  const path = String(req.url || '').split('?')[0].toLowerCase();
  const method = String(req.method || 'GET').toUpperCase();
  if (path.startsWith('/api/admin/content-sync')) return GLOBAL_API_POLICIES.adminSync;
  if (path.startsWith('/api/auth/')) return GLOBAL_API_POLICIES.auth;
  if (method === 'GET' && (path.startsWith('/api/quiz/') || path.startsWith('/api/library/'))) {
    return GLOBAL_API_POLICIES.publicRead;
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) return GLOBAL_API_POLICIES.write;
  return GLOBAL_API_POLICIES.fallback;
}

/**
 * Lớp giới hạn chung cho TOÀN BỘ API. Ngưỡng đọc công khai được đặt cao để
 * không chặn nhầm sinh viên dùng chung Wi-Fi/NAT; các endpoint đăng nhập vẫn
 * có lớp giới hạn chặt hơn theo cả IP và tài khoản ngay trong handler.
 */
export function enforceGlobalApiRateLimit(req, res) {
  if (String(req.method || '').toUpperCase() === 'OPTIONS') return true;
  const policy = getGlobalApiPolicy(req);
  const ip = getClientIp(req);
  const result = checkRateLimit(`global:${policy.id}:${ip}`, policy.maxRequests, policy.windowMs);
  const resetSeconds = Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000));
  res.setHeader('RateLimit-Limit', String(policy.maxRequests));
  res.setHeader('RateLimit-Remaining', String(result.remaining));
  res.setHeader('RateLimit-Reset', String(resetSeconds));
  res.setHeader('RateLimit-Policy', `${policy.maxRequests};w=${Math.ceil(policy.windowMs / 1000)}`);
  if (result.allowed) return true;

  res.setHeader('Retry-After', String(result.retryAfterSeconds || resetSeconds || 1));
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.status(429).json({
    success: false,
    message: 'Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ một chút rồi thử lại.'
  });
  return false;
}
