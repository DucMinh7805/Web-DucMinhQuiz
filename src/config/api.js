/**
 * CẤU HÌNH ĐƯỜNG LINK WEB APP URL TỪ GOOGLE APPS SCRIPT
 * Đã kết nối chính xác 2 Sheet: Sheet Đề Thi và Sheet Quản Lý Mật Khẩu
 */

export const API_CONFIG = {
  // 1. LINK WEB APP CỦA SHEET ĐỀ THI & MÔN HỌC (Sheet 1)
  QUIZ_DATABASE_URL: 'https://script.google.com/macros/s/AKfycbwl4PVbJ_-3VRyYvNwH9nTvTW74GguAxHKhGvoLVtRyHrPC6IoYZaIv8cp8ztftkbz5/exec',

  // 2. LINK WEB APP CỦA SHEET QUẢN LÝ MẬT KHẨU / USERS (Sheet 2)
  // Quản lý: Đăng ký, Đăng nhập, Kiểm tra SĐT & Mật khẩu
  AUTH_DATABASE_URL: 'https://script.google.com/macros/s/AKfycbwHCWAEmUOpB_zKZjUE7NztmIQgIXd_Tz5uIX-3OX2uVeqcvgSSuWAm8YCFIlhY2097/exec'
};
