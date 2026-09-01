/**
 * CẤU HÌNH ĐƯỜNG LINK WEB APP URL TỪ GOOGLE APPS SCRIPT
 * Ưu tiên đọc từ biến môi trường (.env) nếu có.
 * Fallback về URL mặc định để đảm bảo hoạt động khi deploy
 * mà chưa cấu hình Environment Variables trên hosting.
 */

const DEFAULT_QUIZ_URL = 'https://script.google.com/macros/s/AKfycbyOy_VJu88x2PadlUvGy-Ajg8mODrAOsas6LrtOuESJQtk-y3elzu6u5VkwOiJ9xZva/exec';

export const API_CONFIG = {
  // 1. LINK WEB APP CỦA SHEET ĐỀ THI & MÔN HỌC (Sheet 1)
  QUIZ_DATABASE_URL: import.meta.env.VITE_QUIZ_DATABASE_URL || DEFAULT_QUIZ_URL
};
