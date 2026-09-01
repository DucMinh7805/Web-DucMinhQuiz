import { API_CONFIG } from '../config/api';
import { DEFAULT_SAMPLE_MANIFEST } from '../data/defaultManifest';

/**
 * Lấy danh sách Manifest (Chuyên khoa, Môn học, Bộ đề, Sách & Slide)
 * Ưu tiên gọi MongoDB Backend API (/api/quiz/manifest) tốc độ 10-30ms
 * Tự động fallback về Google Apps Script hoặc Cache nếu offline
 */
export async function fetchManifest() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  // 1. Thử tải từ MongoDB Backend API mới
  try {
    const apiRes = await fetch(`/api/quiz/manifest?_t=${Date.now()}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.success && Array.isArray(data.subjects) && data.subjects.length > 0) {
        const cleanManifest = {
          subjects: data.subjects,
          books: Array.isArray(data.books) ? data.books : []
        };
        try {
          localStorage.setItem('medquiz_manifest', JSON.stringify(cleanManifest));
        } catch {}
        return cleanManifest;
      }
    }
  } catch {
    // Backend API chưa chạy hoặc đang ở môi trường static
  }

  // 2. Fallback sang Google Apps Script URL cũ
  if (API_CONFIG.QUIZ_DATABASE_URL) {
    const gasController = new AbortController();
    const gasTimeout = setTimeout(() => gasController.abort(), 20000);

    try {
      const res = await fetch(`${API_CONFIG.QUIZ_DATABASE_URL}?action=getManifest&_t=${Date.now()}`, { 
        redirect: "follow",
        credentials: "omit",
        signal: gasController.signal
      });
      
      clearTimeout(gasTimeout);

      if (res.ok) {
        const rawText = await res.text();
        if (rawText && (rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
          const data = JSON.parse(rawText);
          if (data && Array.isArray(data.subjects) && data.subjects.length > 0) {
            const cleanManifest = {
              subjects: data.subjects,
              books: Array.isArray(data.books) ? data.books : []
            };
            try {
              localStorage.setItem('medquiz_manifest', JSON.stringify(cleanManifest));
            } catch {}
            return cleanManifest;
          }
        }
      }
    } catch (gasError) {
      clearTimeout(gasTimeout);
      console.warn('[QuizAPI] Lỗi kết nối Google Apps Script, chuyển sang dùng cache:', gasError);
    }
  }

  // 3. Fallback đọc Cache LocalStorage
  const cached = _getLocalManifest();
  if (cached && Array.isArray(cached.subjects) && cached.subjects.length > 0) {
    return cached;
  }

  return DEFAULT_SAMPLE_MANIFEST;
}

/**
 * Đọc Manifest từ LocalStorage Cache
 */
function _getLocalManifest() {
  try {
    const local = localStorage.getItem('medquiz_manifest');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
        return parsed;
      }
    }
  } catch(e) {
    console.warn('[QuizAPI] Lỗi đọc cache:', e);
  }
  return DEFAULT_SAMPLE_MANIFEST;
}

/**
 * Lấy nội dung chi tiết của một Đề thi (Danh sách câu hỏi & hình ảnh)
 * Ưu tiên gọi MongoDB Backend API (/api/quiz/questions)
 * @param {string} actualPath - Đường dẫn bộ đề
 * @param {AbortSignal} signal 
 */
export async function fetchDeckQuestions(actualPath, signal) {
  if (!actualPath) throw new Error("Đường dẫn không hợp lệ");

  // Không fallback sang GAS công khai: fallback đó sẽ bỏ qua kiểm tra quyền PRO.
  const apiRes = await fetch(`/api/quiz/questions?deckPath=${encodeURIComponent(actualPath)}&_t=${Date.now()}`, {
    signal,
    credentials: 'include'
  });
  const json = await apiRes.json().catch(() => ({}));
  if (!apiRes.ok) throw new Error(json.message || 'Không thể tải bộ đề.');
  if (json?.success && Array.isArray(json.data)) return json.data;
  throw new Error('Máy chủ trả về dữ liệu câu hỏi không hợp lệ.');
}
