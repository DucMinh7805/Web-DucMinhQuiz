import { API_CONFIG } from '../config/api';

const SCRIPT_URL = API_CONFIG.QUIZ_DATABASE_URL;

/**
 * Lấy danh sách Manifest (Môn học và Bộ đề) từ hệ thống
 */
export async function fetchManifest() {
  const res = await fetch(`${SCRIPT_URL}?action=getManifest`, { 
    redirect: "follow",
    credentials: "omit"
  });
  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error("Không thể phân tích dữ liệu môn học từ Google Sheet. Vui lòng thử lại.");
  }
  if (data.error) throw new Error(data.error);
  return data;
}

/**
 * Lấy nội dung chi tiết của một Đề thi (Danh sách câu hỏi)
 * @param {string} actualPath 
 * @param {AbortSignal} signal 
 */
export async function fetchDeckQuestions(actualPath, signal) {
  if (!actualPath) throw new Error("Đường dẫn không hợp lệ");
  
  const res = await fetch(`${SCRIPT_URL}?action=getDeck&path=${actualPath}`, { 
    redirect: "follow",
    credentials: "omit",
    signal
  });
  
  if (!res.ok) {
    throw new Error(`Google Apps Script trả về lỗi (${res.status})`);
  }

  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error("Dữ liệu đề thi từ Google Apps Script không hợp lệ.");
  }
  if (data.error) throw new Error(data.error);
  
  return data.map((q, idx) => ({
    id: q.id || `q_${idx}`,
    ...q,
    question: q.question || q.CauHoi || '',
    answer: q.answer || q.DapAn || '',
    explanation: q.explanation || q.GiaiThich || q.coche || '',
    source: q.source || q.Nguon || q.reference || '',
    imageUrl: q.imageUrl || q.image || '',
    parsedOptions: q.options 
      ? (Array.isArray(q.options) ? q.options : q.options.split('|')) 
      : [q.optA || q.A, q.optB || q.B, q.optC || q.C, q.optD || q.D].filter(Boolean)
  }));
}
