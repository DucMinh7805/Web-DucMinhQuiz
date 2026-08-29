/**
 * In-memory sliding window Rate Limiter
 * Phù hợp cho Serverless & Node.js instance
 */
const rateLimitMap = new Map();

// Tự động dọn dẹp các IP quá hạn mỗi 10 phút
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function checkRateLimit(key, maxRequests = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetAt <= now) {
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
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}
