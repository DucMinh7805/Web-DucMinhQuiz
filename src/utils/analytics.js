/**
 * Module Analytics Ẩn Danh (Anonymous Event Tracker)
 * - Tối ưu cho hiệu năng, không làm chậm quá trình tải trang
 * - Sử dụng navigator.sendBeacon cho các sự kiện drop-off / rời trang
 * - Fallback sang fetch(..., { keepalive: true }) khi cần kèm custom headers
 */

export function trackEvent(eventName, payload = {}) {
  if (typeof window === 'undefined') return;

  const eventData = {
    event: eventName,
    ...payload,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };

  // Nếu đang ở môi trường dev, log ra console để dễ kiểm tra
  if (import.meta.env.DEV) {
    console.debug(`[Analytics] Track Event: ${eventName}`, eventData);
    return;
  }

  const endpoint = '/api/analytics';
  const dataString = JSON.stringify(eventData);

  // 1. Thử gửi bằng navigator.sendBeacon nếu payload < 64KB (an toàn khi user tắt tab)
  if (navigator.sendBeacon && dataString.length < 60000) {
    try {
      const blob = new Blob([dataString], { type: 'application/json' });
      const success = navigator.sendBeacon(endpoint, blob);
      if (success) return;
    } catch {
      // Fallback xuống fetch nếu sendBeacon thất bại
    }
  }

  // 2. Fallback sang fetch với cờ keepalive
  try {
    fetch(endpoint, {
      method: 'POST',
      body: dataString,
      headers: {
        'Content-Type': 'application/json'
      },
      keepalive: true
    }).catch(() => {
      // Bỏ qua lỗi gửi analytics ẩn danh, không làm ảnh hưởng đến UX người dùng
    });
  } catch {
    // Silent catch
  }
}
