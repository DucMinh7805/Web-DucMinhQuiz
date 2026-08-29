/**
 * CẤU HÌNH ĐƯỜNG LINK WEB APP URL TỪ GOOGLE APPS SCRIPT
 * Các URL được lấy từ biến môi trường (.env) để bảo mật
 * Fallback về chuỗi rỗng nếu chưa cấu hình
 */

export const API_CONFIG = {
  // 1. LINK WEB APP CỦA SHEET ĐỀ THI & MÔN HỌC (Sheet 1)
  QUIZ_DATABASE_URL: import.meta.env.VITE_QUIZ_DATABASE_URL || '',

  // 2. LINK WEB APP CỦA SHEET QUẢN LÝ MẬT KHẨU / USERS (Sheet 2)
  // Quản lý: Đăng ký, Đăng nhập, Kiểm tra SĐT & Mật khẩu
  AUTH_DATABASE_URL: import.meta.env.VITE_AUTH_DATABASE_URL || ''
};
