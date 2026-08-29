/**
 * CẤU HÌNH ĐƯỜNG LINK WEB APP URL TỪ GOOGLE APPS SCRIPT
 * Ưu tiên đọc từ biến môi trường (.env) nếu có.
 * Fallback về URL mặc định để đảm bảo hoạt động khi deploy
 * mà chưa cấu hình Environment Variables trên hosting.
 */

const DEFAULT_QUIZ_URL = 'https://script.google.com/macros/s/AKfycbyOy_VJu88x2PadlUvGy-Ajg8mODrAOsas6LrtOuESJQtk-y3elzu6u5VkwOiJ9xZva/exec';
const DEFAULT_AUTH_URL = 'https://script.google.com/macros/s/AKfycbwHCWAEmUOpB_zKZjUE7NztmIQgIXd_Tz5uIX-3OX2uVeqcvgSSuWAm8YCFIlhY2097/exec';

export const API_CONFIG = {
  // 1. LINK WEB APP CỦA SHEET ĐỀ THI & MÔN HỌC (Sheet 1)
  QUIZ_DATABASE_URL: import.meta.env.VITE_QUIZ_DATABASE_URL || DEFAULT_QUIZ_URL,

  // 2. LINK WEB APP CỦA SHEET QUẢN LÝ MẬT KHẨU / USERS (Sheet 2)
  // Quản lý: Đăng ký, Đăng nhập, Kiểm tra SĐT & Mật khẩu
  AUTH_DATABASE_URL: import.meta.env.VITE_AUTH_DATABASE_URL || DEFAULT_AUTH_URL
};

