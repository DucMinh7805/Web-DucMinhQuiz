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
        } catch(e) {}
        return cleanManifest;
      }
    }
  } catch (backendErr) {
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
            } catch(e) {}
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

  // 1. Thử tải từ MongoDB Backend API mới
  try {
    const apiRes = await fetch(`/api/quiz/questions?deckPath=${encodeURIComponent(actualPath)}&_t=${Date.now()}`, {
      signal
    });

    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (e) {
    // Tiếp tục fallback
  }

  // 2. Fallback sang Google Apps Script
  if (API_CONFIG.QUIZ_DATABASE_URL) {
    try {
      const gasRes = await fetch(`${API_CONFIG.QUIZ_DATABASE_URL}?action=getDeck&path=${encodeURIComponent(actualPath)}&_t=${Date.now()}`, { 
        redirect: "follow",
        credentials: "omit",
        signal
      });
    
      if (gasRes.ok) {
        const rawText = await gasRes.text();
        if (rawText && (rawText.trim().startsWith('[') || rawText.trim().startsWith('{'))) {
          const gasData = JSON.parse(rawText);
          if (Array.isArray(gasData) && gasData.length > 0) {
            return gasData.map((q, idx) => {
              let rawImg = q.imageUrl || q.image || q.img || q.anh || q.hinhAnh || '';
              let questionText = q.question || q.CauHoi || '';
              let vignetteText = q.vignette || q.MoTa || q.vignetteBody || '';
              let rawOptions = q.options || q.choices || '';
              let parsedOpts = [];
              if (rawOptions) {
                parsedOpts = Array.isArray(rawOptions) ? rawOptions : String(rawOptions).split('|').map(s => s.trim()).filter(Boolean);
              }

              let qType = q.type;
              if (!qType) {
                if (parsedOpts.length === 0) qType = 'short_answer';
                else qType = 'single';
              }

              return {
                id: q.id || `q_${idx}`,
                type: qType,
                ...q,
                question: questionText,
                vignette: vignetteText,
                answer: q.answer || q.DapAn || '',
                explanation: q.explanation || q.GiaiThich || q.coche || '',
                source: q.source || q.Nguon || q.reference || '',
                imageUrl: rawImg,
                parsedOptions: parsedOpts
              };
            });
          }
        }
      }
    } catch (e) {
      console.warn("[QuizAPI] Lỗi kết nối Google Apps Script:", e);
      throw new Error("Không thể tải nội dung bộ đề. Vui lòng kiểm tra kết nối mạng!");
    }
  }

  return [];
}
