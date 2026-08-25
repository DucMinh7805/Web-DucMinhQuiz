import { API_CONFIG } from '../config/api';

/**
 * Lấy danh sách Manifest (Chuyên khoa, Môn học, Bộ đề, Sách & Slide)
 * Nguồn dữ liệu: Google Sheet Manifest (đảm bảo hiển thị đầy đủ Chuyên khoa, Thư viện Sách & Bản đồ)
 */
export async function fetchManifest() {
  try {
    const res = await fetch(`${API_CONFIG.QUIZ_DATABASE_URL}?action=getManifest`, { 
      redirect: "follow",
      credentials: "omit"
    });
    
    if (!res.ok) {
      throw new Error(`Lỗi kết nối máy chủ (${res.status})`);
    }

    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error("Không thể phân tích dữ liệu môn học từ Google Sheet.");
    }
    
    if (data.error) throw new Error(data.error);

    // Đảm bảo cấu trúc subjects và books luôn tồn tại
    return {
      subjects: Array.isArray(data.subjects) ? data.subjects : [],
      books: Array.isArray(data.books) ? data.books : []
    };
  } catch (error) {
    console.error('Error fetching manifest:', error);
    throw error;
  }
}

/**
 * Lấy nội dung chi tiết của một Đề thi (Danh sách câu hỏi & hình ảnh)
 * Ưu tiên 1: Tải siêu tốc từ Backend Vercel / MongoDB (có đầy đủ hình ảnh & tự luận ngắn)
 * Ưu tiên 2 (Dự phòng): Tải từ Google Sheet cũ nếu đề chưa được đồng bộ sang MongoDB
 * @param {string} actualPath - Đường dẫn bộ đề (VD: 'noi-tim-mach/de-1' hoặc 'y-khoa/giai-phau/de-1')
 * @param {AbortSignal} signal 
 */
export async function fetchDeckQuestions(actualPath, signal) {
  if (!actualPath) throw new Error("Đường dẫn không hợp lệ");

  // 1. Thử tải từ Backend Vercel / MongoDB trước
  try {
    const vercelRes = await fetch(`/api/questions?deckPath=${encodeURIComponent(actualPath)}`, { signal });
    if (vercelRes.ok) {
      const vercelJson = await vercelRes.json();
      if (vercelJson.success && Array.isArray(vercelJson.data) && vercelJson.data.length > 0) {
        return vercelJson.data.map((q, idx) => ({
          id: q._id || q.qId || `q_${idx}`,
          ...q,
          question: q.question || '',
          answer: q.answer || '',
          explanation: q.explanation || '',
          imageUrl: q.imageUrl || '',
          parsedOptions: Array.isArray(q.options) ? q.options : (q.options ? String(q.options).split('|') : [])
        }));
      }
    }
  } catch (e) {
    console.warn("MongoDB fetch skipped or failed, fallback to Google Apps Script:", e);
  }

  // 2. Dự phòng: Tải từ Google Apps Script nếu MongoDB chưa có dữ liệu đề này
  const gasRes = await fetch(`${API_CONFIG.QUIZ_DATABASE_URL}?action=getDeck&path=${encodeURIComponent(actualPath)}`, { 
    redirect: "follow",
    credentials: "omit",
    signal
  });
  
  if (!gasRes.ok) {
    throw new Error(`Google Apps Script trả về lỗi (${gasRes.status})`);
  }

  const rawText = await gasRes.text();
  let gasData;
  try {
    gasData = JSON.parse(rawText);
  } catch {
    throw new Error("Dữ liệu đề thi từ Google Apps Script không hợp lệ.");
  }
  if (gasData.error) throw new Error(gasData.error);
  
  if (!Array.isArray(gasData)) {
    throw new Error("Dữ liệu đề thi không đúng định dạng danh sách.");
  }

  return gasData.map((q, idx) => {
    let rawImg = q.imageUrl || q.image || q.img || q.anh || q.hinhAnh || '';
    let questionText = q.question || q.CauHoi || '';
    let vignetteText = q.vignette || q.MoTa || q.vignetteBody || '';

    // Tự động bóc tách link ảnh nếu người soạn đề dán trong phần mô tả câu hỏi hoặc nội dung câu hỏi
    if (!rawImg) {
      const urlRegex = /(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"'<>]*)?|https?:\/\/(?:drive|docs)\.google\.com\/[^\s"'<>]+)/i;
      const matchV = vignetteText.match(urlRegex);
      const matchQ = questionText.match(urlRegex);
      if (matchV) {
        rawImg = matchV[0];
      } else if (matchQ) {
        rawImg = matchQ[0];
      }
    }

    return {
      id: q.id || `q_${idx}`,
      ...q,
      question: questionText,
      vignette: vignetteText,
      answer: q.answer || q.DapAn || '',
      explanation: q.explanation || q.GiaiThich || q.coche || '',
      source: q.source || q.Nguon || q.reference || '',
      imageUrl: rawImg,
      parsedOptions: q.options 
        ? (Array.isArray(q.options) ? q.options : String(q.options).split('|')) 
        : (q.choices ? (Array.isArray(q.choices) ? q.choices : String(q.choices).split('|')) : [])
    };
  });
}
