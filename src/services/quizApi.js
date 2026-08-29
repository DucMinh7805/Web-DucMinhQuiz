import { API_CONFIG } from '../config/api';
import { DEFAULT_SAMPLE_MANIFEST } from '../data/defaultManifest';

/**
 * Lấy danh sách Manifest (Chuyên khoa, Môn học, Bộ đề, Sách & Slide)
 * - Tải 100% dữ liệu thực từ Google Apps Script của người dùng
 * - Tuyệt đối không sinh dữ liệu môn học giả lập / mô phỏng
 */
export async function fetchManifest() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(`${API_CONFIG.QUIZ_DATABASE_URL}?action=getManifest`, { 
      redirect: "follow",
      credentials: "omit",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

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
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[QuizAPI] Không thể tải Manifest từ Google Apps Script:', error);
  }

  // Đọc từ Cache LocalStorage nếu có dữ liệu đã đồng bộ trước đó
  try {
    const local = localStorage.getItem('medquiz_manifest');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
        return parsed;
      }
    }
  } catch(e) {}

  return DEFAULT_SAMPLE_MANIFEST;
}

/**
 * Lấy nội dung chi tiết của một Đề thi (Danh sách câu hỏi & hình ảnh thực tế)
 * Hỗ trợ trọn vẹn: Trắc nghiệm đơn, Nhiều đáp án, Tự luận ngắn điền từ (Short Answer)
 * @param {string} actualPath - Đường dẫn bộ đề (VD: 'THUC_TAP_GIAI_PHAU/2025_THUC_TAP_GP_HE_SINH_DUC_NAM_ONG_BEN')
 * @param {AbortSignal} signal 
 */
export async function fetchDeckQuestions(actualPath, signal) {
  if (!actualPath) throw new Error("Đường dẫn không hợp lệ");

  // 1. Thử tải từ Backend Vercel / MongoDB trước nếu có
  try {
    const vercelRes = await fetch(`/api/questions?deckPath=${encodeURIComponent(actualPath)}`, { signal });
    if (vercelRes.ok) {
      const vercelJson = await vercelRes.json();
      if (vercelJson.success && Array.isArray(vercelJson.data) && vercelJson.data.length > 0) {
        return vercelJson.data.map((q, idx) => ({
          id: q._id || q.qId || `q_${idx}`,
          type: q.type || (Array.isArray(q.options) && q.options.length > 0 ? 'single' : 'short_answer'),
          ...q,
          question: q.question || '',
          answer: q.answer || '',
          explanation: q.explanation || '',
          imageUrl: q.imageUrl || '',
          parsedOptions: Array.isArray(q.options) ? q.options : (q.options ? String(q.options).split('|') : [])
        }));
      }
    }
  } catch (e) {}

  // 2. Tải trực tiếp từ Google Apps Script
  try {
    const gasRes = await fetch(`${API_CONFIG.QUIZ_DATABASE_URL}?action=getDeck&path=${encodeURIComponent(actualPath)}`, { 
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
    throw new Error("Không thể tải nội dung bộ đề từ Google Apps Script. Vui lòng kiểm tra kết nối mạng!");
  }

  return [];
}
