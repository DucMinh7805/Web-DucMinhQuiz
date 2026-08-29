/**
 * Chuẩn hóa số điện thoại Việt Nam về định dạng thống nhất: 0xxxxxxxxx (10 chữ số)
 * Hỗ trợ các đầu số: +84, 84, có dấu cách, dấu chấm, gạch ngang
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  
  // Loại bỏ mọi ký tự không phải là số và dấu +
  let cleaned = rawPhone.trim().replace(/[\s.-]/g, '');

  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Nếu đã bắt đầu bằng 0 và có độ dài 10 chữ số
  const phoneRegex = /^0[3|5|7|8|9][0-9]{8}$/;
  if (phoneRegex.test(cleaned)) {
    return cleaned;
  }

  // Fallback nếu người dùng nhập số 10 chữ số thông thường bắt đầu bằng 0
  if (/^0[0-9]{9}$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned;
}

/**
 * Kiểm tra tính hợp lệ của số điện thoại Việt Nam
 */
export function isValidVietnamesePhone(phone) {
  const normalized = normalizePhone(phone);
  return /^0[3|5|7|8|9][0-9]{8}$/.test(normalized);
}
